import { jsonrepair } from 'jsonrepair';
import { useEffect, useMemo, useRef, useState } from 'react';
import toastr from 'toastr';
import { getWorldbookEntryContents } from '../../../utils/worldbook';
import { ITEM_CATEGORIES, RANKS, SHOP_CATEGORIES } from './constants';
import { extractJsonArray, normalizeItem, pruneItemForShop, sanitizeItemForShop, splitLines, validateItem } from './utils';

interface ShopRefreshContext {
  targetTypes: string[];
  refreshCount: number;
  mustHaveItem: any | null;
  refreshAll: boolean;
  existingItems: any[];
}

interface UseShopRefreshOptions {
  data: any;
  onReplaceShopItems?: (items: any[]) => void;
  setIsEditingAll: (val: boolean) => void;
  shopApiConfig?: { apiurl: string; key: string; model: string; retries: number };
  multiApiEnabled?: boolean;
}

export const useShopRefresh = ({ data, onReplaceShopItems, setIsEditingAll, shopApiConfig, multiApiEnabled }: UseShopRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [refreshTypes, setRefreshTypes] = useState<string[]>(['全部']);
  const [refreshCount, setRefreshCount] = useState(8);
  const [refreshKeyword, setRefreshKeyword] = useState('');
  const [eroticCount, setEroticCount] = useState(0);
  const [eroticKeyword, setEroticKeyword] = useState('');
  const [rankCounts, setRankCounts] = useState<Record<(typeof RANKS)[number], number>>({
    仙: 0,
    天: 0,
    地: 0,
    玄: 0,
    黄: 0,
    凡: 0,
  });
  const [mustHaveEnabled, setMustHaveEnabled] = useState(false);
  const [mustHaveForm, setMustHaveForm] = useState({
    名称: '',
    分类: '功法',
    着装类型: '上衣',
    描述: '',
    价格: 0,
    数量: 1,
    品阶: '凡阶',
    固定加成文本: '',
    效果文本: '',
    内容文本: '',
    招式文本: ''
  });
  const [fixError, setFixError] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [reviewErrors, setReviewErrors] = useState<Record<number, string[]>>({});
  const lastRefreshRef = useRef<ShopRefreshContext | null>(null);
  const refreshEditingRef = useRef(false);

  useEffect(() => {
    if (isRefreshing) {
      if (!refreshEditingRef.current) {
        setIsEditingAll(true);
        refreshEditingRef.current = true;
      }
      return;
    }
    if (refreshEditingRef.current) {
      setIsEditingAll(false);
      refreshEditingRef.current = false;
    }
  }, [isRefreshing, setIsEditingAll]);

  const normalizeApiUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/\/v1\/?$/.test(trimmed)) return trimmed.replace(/\/$/, '');
    return `${trimmed.replace(/\/$/, '')}/v1`;
  };

  const buildShopCustomApi = () => {
    if (!multiApiEnabled) return null;
    if (!shopApiConfig?.apiurl?.trim()) return null;
    const normalizedUrl = normalizeApiUrl(shopApiConfig.apiurl || '');
    if (!normalizedUrl) return null;
    return {
      apiurl: normalizedUrl,
      key: shopApiConfig.key?.trim(),
      model: shopApiConfig.model || 'gpt-4o-mini',
      source: 'openai'
    };
  };

  const toggleRefreshType = (type: string) => {
    setRefreshTypes(prev => {
      if (type === '全部') {
        return prev.includes('全部') ? prev.filter(item => item !== '全部') : ['全部'];
      }
      if (prev.includes('全部')) {
        return [type];
      }
      if (prev.includes(type)) {
        return prev.filter(item => item !== type);
      }
      return [...prev, type];
    });
  };

  const buildMustHaveItem = () => {
    if (!mustHaveEnabled) return null;
    if (!mustHaveForm.名称.trim() || !mustHaveForm.描述.trim()) {
      toastr.warning('必定出现商品信息不完整');
      return null;
    }
    const parseMoves = (raw: string) => {
      const lines = splitLines(raw);
      return lines.map(line => {
        const parts = line.split('|').map(part => part.trim());
        const [name, desc, effectsRaw] = parts;
        const effects = effectsRaw
          ? effectsRaw.split(/[;；,，]/).map(t => t.trim()).filter(Boolean)
          : [];
        return {
          名称: name || '未知招式',
          描述: desc || '暂无招式描述',
          效果: effects,
        };
      });
    };
    const item = {
      名称: mustHaveForm.名称.trim(),
      分类: mustHaveForm.分类,
      描述: mustHaveForm.描述.trim(),
      价格: Number(mustHaveForm.价格) || 0,
      数量: Math.max(1, Math.floor(Number(mustHaveForm.数量) || 1)),
      品阶: mustHaveForm.品阶.trim() || '凡阶',
      固定加成: splitLines(mustHaveForm.固定加成文本),
      效果: splitLines(mustHaveForm.效果文本),
      内容: splitLines(mustHaveForm.内容文本),
      招式: parseMoves(mustHaveForm.招式文本),
    } as any;
    if (item.分类 === '着装') {
      item.着装类型 = mustHaveForm.着装类型;
    }
    if (item.分类 === '功法') {
      delete item.效果;
      delete item.内容;
    } else if (item.分类 === '特殊') {
      delete item.固定加成;
      delete item.效果;
    } else if (item.分类 === '着装') {
      delete item.内容;
    } else if (item.分类 === '丹药' || item.分类 === '阵符') {
      delete item.固定加成;
      delete item.内容;
    } else {
      // 武器/装备/法宝
      delete item.内容;
    }
    return item;
  };

  const applyItemsWithContext = (items: any[], context: ShopRefreshContext) => {
    const merged = context.refreshAll
      ? items
      : [
          ...context.existingItems.filter((item: any) => !context.targetTypes.includes(item.分类)),
          ...items
        ];
    onReplaceShopItems?.(merged);
    toastr.success('商城刷新成功');
    setIsRefreshing(false);
  };

  const parseAndValidateItems = (text: string, context: ShopRefreshContext) => {
    const jsonText = extractJsonArray(text);
    const repaired = jsonrepair(jsonText);
    const parsed = JSON.parse(repaired);
    if (!Array.isArray(parsed)) {
      throw new Error('生成结果不是数组');
    }

    const normalized = parsed.map(normalizeItem);
    const filtered = normalized.filter(item => context.targetTypes.includes(item.分类));
    if (filtered.length < context.refreshCount) {
      throw new Error('生成商品数量不足或分类不匹配');
    }

    const finalItems = filtered
      .slice(0, context.refreshCount)
      .map(item => pruneItemForShop(normalizeItem(item)));

    if (context.mustHaveItem) {
      const exists = finalItems.some(item => item.名称 === context.mustHaveItem.名称);
      if (!exists) {
        finalItems.unshift(normalizeItem(context.mustHaveItem));
      }
    }
    const errorsMap: Record<number, string[]> = {};
    finalItems.forEach((item, idx) => {
      const errors = validateItem(item);
      if (errors.length > 0) {
        errorsMap[idx] = errors;
      }
    });

    return { items: finalItems, errorsMap };
  };

  const updateReviewItem = (index: number, patch: any) => {
    setReviewItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const autoFixReviewItems = () => {
    const fixed = reviewItems.map(item => {
      const beforeFixedBonus = Array.isArray(item.固定加成) ? [...item.固定加成] : [];
      const after = sanitizeItemForShop(item);
      const afterFixedBonus = Array.isArray(after.固定加成) ? after.固定加成 : [];
      const normalizedBefore = sanitizeItemForShop({ ...item, 固定加成: beforeFixedBonus }).固定加成 || [];
      const fixedBonusChanged = JSON.stringify(normalizedBefore) !== JSON.stringify(afterFixedBonus);
      return {
        ...after,
        $autoFixed: true,
        $fixedBonusChanged: fixedBonusChanged,
        $fixedBonusOriginal: beforeFixedBonus,
      };
    });
    const errorsMap: Record<number, string[]> = {};
    fixed.forEach((item, idx) => {
      const errors = validateItem(item);
      if (errors.length > 0) {
        errorsMap[idx] = errors;
      }
    });
    setReviewItems(fixed);
    setReviewErrors(errorsMap);
    if (Object.keys(errorsMap).length === 0) {
      setFixError('');
    } else {
      setFixError('已自动修正，但仍有格式错误');
    }
  };

  const handleReviewConfirm = () => {
    if (!lastRefreshRef.current) {
      setShowReviewModal(false);
      return;
    }
    const errorsMap: Record<number, string[]> = {};
    reviewItems.forEach((item, idx) => {
      const errors = validateItem(item);
      if (errors.length > 0) {
        errorsMap[idx] = errors;
      }
    });
    if (Object.keys(errorsMap).length > 0) {
      setReviewErrors(errorsMap);
      setFixError('仍有格式错误，请修正后再确认');
      return;
    }
    applyItemsWithContext(reviewItems, lastRefreshRef.current);
    setShowReviewModal(false);
    setReviewErrors({});
    setFixError('');
  };

  const handleQuickRefresh = async () => {
    if (isGenerating) return;
    if (refreshTypes.length === 0) {
      toastr.warning('请选择刷新类型');
      return;
    }

    const targetTypes = refreshTypes.includes('全部') ? ITEM_CATEGORIES : refreshTypes;
    if (targetTypes.length === 0) {
      toastr.warning('请选择刷新类型');
      return;
    }
    if (!onReplaceShopItems) {
      toastr.error('无法写回商城列表');
      return;
    }

    const mustHaveItem = buildMustHaveItem();
    if (mustHaveEnabled && !mustHaveItem) {
      return;
    }
    if (mustHaveItem && !targetTypes.includes(mustHaveItem.分类)) {
      toastr.warning('必定出现商品分类不在刷新类型中');
      return;
    }

    const rankTotal = Object.values(rankCounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
    if (rankTotal > refreshCount) {
      toastr.warning('品阶数量总和超过刷新数量');
      return;
    }
    if (eroticCount > refreshCount) {
      toastr.warning('色情商品数量超过刷新数量');
      return;
    }

    const outputRules = [
      'Output JSON array only; include item objects only.',
      'Do not include explanations or code fences.',
      '分类仅可为：功法/武器/装备/法宝/着装/丹药/阵符/特殊。',
      '字段规则（缺一不可）：',
      '通用字段：名称、分类、描述、价格、数量、品阶。',
      '1) 功法：固定加成；可选：招式（数组，1-3个）。',
      '   - 招式数组元素结构：{ 名称, 描述, 效果(数组) }。',
      '2) 特殊：内容（数组）。',
      '3) 着装：固定加成、效果、着装类型。',
      '4) 丹药/阵符：效果。',
      '5) 武器/装备/法宝：固定加成、效果。',
      '着装类型仅可为：上衣/下衣/内衣/鞋子/袜子/佩戴物。',
      '数量必须为整数，且 >= 1。',
      '固定加成格式：当前(根骨|神海|悟性|魅力|气运|杀伐|神伤|横练|身法) ± 数值(可选%)；或 基础(生命|灵气|道心) ± 数值(可选%)。',
      '固定加成字段只允许用于：功法/武器/装备/法宝/着装。',
      '效果字段只允许用于：武器/装备/法宝/着装/丹药/阵符。',
      '内容字段只允许用于：特殊。'
    ].join('\n');

    const typeText = targetTypes.join('、');
    const keywordText = refreshKeyword.trim() ? refreshKeyword.trim() : '无';
    const mustHaveText = mustHaveItem ? JSON.stringify(mustHaveItem, null, 2) : '无';
    const eroticText = eroticCount > 0
      ? `${eroticCount}（涉及性爱/调教/欲望等主题）。色情关键词：${eroticKeyword.trim() || '无'}。`
      : '0。';
    const rankText = rankTotal > 0
      ? `${RANKS.map(rank => `${rank}${rankCounts[rank] || 0}`).join('、')}。`
      : '无明确要求。';

    const promptTemplate = [
      '身份与任务：',
      '你是名古风修仙类型的RPG游戏设计师，你需要根据以下资料，设计不同类型的物品、功法和法宝',
      '',
      '参考资料：',
      '{worldbook:[仙玉录|仙缘商城]}',
      '{worldbook:[数值|物品数值基准]}',
      '',
      '本次设计商品的要求：',
      `- 刷新类型：${typeText}`,
      `- 刷新数量：${refreshCount}`,
      `- 主题关键词：${keywordText}`,
      `- 色情商品数量：${eroticText}`,
      `- 品阶数量：${rankText}`,
      `- 必定出现商品：${mustHaveText}`,
      '',
      '输出格式要求：',
      outputRules
    ].join('\n');

    const worldbookKeys = Array.from(new Set(
      (promptTemplate.match(/\{worldbook:([^}]+)\}/g) || [])
        .map(match => match.replace(/^\{worldbook:/, '').replace(/\}$/, '').trim())
        .filter(Boolean)
    ));
    const wbContents = worldbookKeys.length > 0 ? await getWorldbookEntryContents(worldbookKeys) : {};

    const prompt = promptTemplate.replace(/\{worldbook:([^}]+)\}/g, (_match, key) => {
      const k = String(key || '').trim();
      return (wbContents as any)[k] || '';
    });

    const existingItems = Array.isArray(data?.商品列表) ? data.商品列表 : [];
    lastRefreshRef.current = {
      targetTypes,
      refreshCount,
      mustHaveItem,
      refreshAll: refreshTypes.includes('全部'),
      existingItems
    };

    let lastRaw = '';
    setIsGenerating(true);
    try {
      const customApi = buildShopCustomApi();
      const retries = Math.max(0, Math.min(10, Number(shopApiConfig?.retries) || 0));
      let lastError: any = null;
      for (let i = 0; i <= retries; i += 1) {
        try {
          lastRaw = await generateRaw({
            user_input: prompt,
            ordered_prompts: ['user_input'],
            ...(customApi ? { custom_api: customApi } : {})
          });
          lastError = null;
          break;
        } catch (error: any) {
          lastError = error;
          if (i === retries) {
            throw error;
          }
        }
      }
      if (lastError) {
        throw lastError;
      }
      const { items, errorsMap } = parseAndValidateItems(lastRaw || '', lastRefreshRef.current);
      setReviewItems(items);
      setReviewErrors(errorsMap);
      setFixError('');
      setShowReviewModal(true);
      setIsRefreshing(false);
    } catch (error: any) {
      console.error('[ShopModal] 刷新失败', error);
      setReviewItems([]);
      setReviewErrors({});
      setFixError(error.message || '格式错误');
      setShowReviewModal(true);
      setIsRefreshing(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const orderedReviewItems = useMemo(() => (
    reviewItems
      .map((item, idx) => ({ item, idx, errors: reviewErrors[idx] }))
      .sort((a, b) => (a.errors ? 0 : 1) - (b.errors ? 0 : 1))
  ), [reviewErrors, reviewItems]);

  return {
    isRefreshing,
    setIsRefreshing,
    isGenerating,
    refreshTypes,
    setRefreshTypes,
    refreshCount,
    setRefreshCount,
    refreshKeyword,
    setRefreshKeyword,
    eroticCount,
    setEroticCount,
    eroticKeyword,
    setEroticKeyword,
    rankCounts,
    setRankCounts,
    mustHaveEnabled,
    setMustHaveEnabled,
    mustHaveForm,
    setMustHaveForm,
    fixError,
    setFixError,
    showReviewModal,
    setShowReviewModal,
    reviewItems,
    reviewErrors,
    orderedReviewItems,
    toggleRefreshType,
    updateReviewItem,
    autoFixReviewItems,
    handleReviewConfirm,
    handleQuickRefresh,
    categories: SHOP_CATEGORIES,
    itemCategories: ITEM_CATEGORIES,
  };
};
