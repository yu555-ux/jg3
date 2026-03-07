import { klona } from 'klona';
import { Crown, Edit3, Gift, Hash, Save, Star, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { getRuntimeSchema } from '../../utils/schemaLoader';
import { getWorldbookEntryContents } from '../../utils/worldbook';
import { useMvuData } from '../../hooks/useMvuData';

interface LuckModalProps {
  data: any;
  onUpdateMvuData?: (newData: any) => void;
  luckApiConfig?: { apiurl: string; key: string; model: string; retries: number };
}

type PrizeItem = {
  名称: string;
  分类: string;
  出货概率: number;
  数量: number;
  品阶: string;
  描述: string;
  固定加成: string[];
  效果: string[];
  内容: string[];
  灵石类型: string;
  着装类型: string;
  招式: Array<{ 名称: string; 描述: string; 效果: string[] }>;
};

type PoolKey = '丙等卜算' | '乙等卜算' | '甲等卜算';

const buildEmptyPrize = (rank: string): PrizeItem => ({
  名称: '未知物品',
  分类: '未知',
  出货概率: 0,
  数量: 1,
  品阶: rank,
  描述: '暂无描述',
  固定加成: [],
  效果: [],
  内容: [],
  灵石类型: '',
  着装类型: '',
  招式: [],
});

const parseLines = (value: string) =>
  (value || '')
    .split(/\r?\n/)
    .map(v => v.trim())
    .filter(Boolean);

const stringifyLines = (values?: string[]) => (values || []).join('\n');

const normalizeApiUrl = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/\/v1\/?$/.test(trimmed)) return trimmed.replace(/\/$/, '');
  return `${trimmed.replace(/\/$/, '')}/v1`;
};

const normalizeLuckItem = (item: any, rankFallback: string) => {
  const base: any = {
    名称: item?.名称 || '未知物品',
    分类: item?.分类 || '未知',
    出货概率: Math.max(0, Math.min(100, Number(item?.出货概率) || 0)),
    数量: Number(item?.数量) || 1,
    品阶: item?.品阶 || rankFallback,
    描述: item?.描述 || '暂无描述',
  };
  switch (item?.分类) {
    case '武器':
    case '装备':
    case '法宝':
      base.固定加成 = Array.isArray(item?.固定加成) ? item.固定加成 : [];
      base.效果 = Array.isArray(item?.效果) ? item.效果 : [];
      return base;
    case '丹药':
    case '阵符':
      base.效果 = Array.isArray(item?.效果) ? item.效果 : [];
      return base;
    case '着装':
      base.着装类型 = item?.着装类型 || '上衣';
      base.固定加成 = Array.isArray(item?.固定加成) ? item.固定加成 : [];
      base.效果 = Array.isArray(item?.效果) ? item.效果 : [];
      return base;
    case '功法':
      base.固定加成 = Array.isArray(item?.固定加成) ? item.固定加成 : [];
      base.招式 = Array.isArray(item?.招式) ? item.招式 : [];
      return base;
    case '特殊':
      base.内容 = Array.isArray(item?.内容) ? item.内容 : [];
      return base;
    default:
      return base;
  }
};

const LuckModal: React.FC<LuckModalProps> = ({ onUpdateMvuData, luckApiConfig }) => {
  const [mvuData, setMvuData] = useMvuData(getRuntimeSchema);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [refreshPoolKey, setRefreshPoolKey] = useState<PoolKey>('丙等卜算');
  const [refreshKeyword, setRefreshKeyword] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pools = useMemo(
    () => [
      { key: '丙等卜算' as PoolKey, label: '丙等卜算', highestRank: '地阶', secondaryRank: '玄阶', accentClass: 'text-amber-500' },
      { key: '乙等卜算' as PoolKey, label: '乙等卜算', highestRank: '天阶', secondaryRank: '地阶', accentClass: 'text-emerald-500' },
      { key: '甲等卜算' as PoolKey, label: '甲等卜算', highestRank: '仙阶', secondaryRank: '天阶', accentClass: 'text-purple-500' },
    ],
    [],
  );

  useEffect(() => {
    if (!isEditing) {
      setDraft(null);
      return;
    }
    setDraft(klona(mvuData.天运卜算 || {}));
  }, [isEditing, mvuData]);

  const ensurePool = (poolKey: PoolKey, base?: any) => {
    const pool = base?.[poolKey] || {};
    const highestRaw = pool.最高级奖品;
    const highest =
      highestRaw && !Array.isArray(highestRaw)
        ? highestRaw
        : Array.isArray(highestRaw)
          ? (highestRaw[0] ?? {})
          : {};
    return {
      最高级奖品: highest,
      次高级奖品: Array.isArray(pool.次高级奖品) ? pool.次高级奖品 : [],
    };
  };

const getSource = () => (isEditing ? draft : mvuData.天运卜算) || {};
  const lotteryCount = getSource().已抽奖次数 ?? 0;

  const updateDraft = (next: any) => {
    setDraft(next);
  };

  const normalizePool = (pool: any) => {
    const highest = pool?.最高级奖品;
    return {
      ...pool,
      最高级奖品: highest && !Array.isArray(highest) ? highest : (Array.isArray(highest) ? (highest[0] ?? {}) : {}),
      次高级奖品: Array.isArray(pool?.次高级奖品) ? pool.次高级奖品 : [],
    };
  };

const saveDraft = () => {
    if (!draft) return;
    const next = klona(draft);
    ['丙等卜算', '乙等卜算', '甲等卜算'].forEach(key => {
      if (next?.[key]) next[key] = normalizePool(next[key]);
    });
    const newData = klona(mvuData);
    newData.天运卜算 = next;
    setMvuData(newData);
    onUpdateMvuData?.(newData);
    setIsEditing(false);
  };

  const updatePrizeField = (
    poolKey: PoolKey,
    target: '最高级奖品' | '次高级奖品',
    index: number | null,
    field: keyof PrizeItem,
    value: any,
  ) => {
    if (!draft) return;
    const next = klona(draft);
    const pool = ensurePool(poolKey, next);
    if (target === '最高级奖品') {
      if (!pool.最高级奖品 || Array.isArray(pool.最高级奖品)) {
        pool.最高级奖品 = buildEmptyPrize(pools.find(p => p.key === poolKey)!.highestRank);
      }
      pool.最高级奖品[field] = value;
    } else {
      if (!Array.isArray(pool.次高级奖品)) pool.次高级奖品 = [];
      if (index === null) return;
      if (!pool.次高级奖品[index]) {
        pool.次高级奖品[index] = buildEmptyPrize(pools.find(p => p.key === poolKey)!.secondaryRank);
      }
      pool.次高级奖品[index][field] = value;
    }
    next[poolKey] = pool;
    updateDraft(next);
  };

  const updateProbability = (
    poolKey: PoolKey,
    target: '最高级奖品' | '次高级奖品',
    index: number | null,
    value: number,
  ) => {
    const nextValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
    updatePrizeField(poolKey, target, index, '出货概率', nextValue);
  };

  const addSecondaryPrize = (poolKey: PoolKey) => {
    if (!draft) return;
    const next = klona(draft);
    const pool = ensurePool(poolKey, next);
    pool.次高级奖品 = [...pool.次高级奖品, buildEmptyPrize(pools.find(p => p.key === poolKey)!.secondaryRank)];
    next[poolKey] = pool;
    updateDraft(next);
  };

  const removeSecondaryPrize = (poolKey: PoolKey, index: number) => {
    if (!draft) return;
    const next = klona(draft);
    const pool = ensurePool(poolKey, next);
    pool.次高级奖品 = pool.次高级奖品.filter((_: any, i: number) => i !== index);
    next[poolKey] = pool;
    updateDraft(next);
  };

  const resetHighestPrize = (poolKey: PoolKey, rank: string) => {
    if (!draft) return;
    const next = klona(draft);
    const pool = ensurePool(poolKey, next);
    pool.最高级奖品 = buildEmptyPrize(rank);
    next[poolKey] = pool;
    updateDraft(next);
  };

  const refreshLuckPool = async () => {
    const poolMeta = pools.find(p => p.key === refreshPoolKey);
    if (!poolMeta) return;
    const config = luckApiConfig || { apiurl: '', key: '', model: '', retries: 0 };
    const normalizedUrl = normalizeApiUrl(config.apiurl || '');
    if (!normalizedUrl) {
      alert('请先在 API 设置中填写天运卜算的 API URL');
      return;
    }
    setIsRefreshing(true);
    try {
      const wbContents = await getWorldbookEntryContents([
        '[仙玉录]天运卜算',
        '[数值]物品数值基准'
      ]);
      const outputRules = [
        '输出为 JSON 对象，仅包含两个字段：最高级奖品、次高级奖品。',
        '最高级奖品为对象，次高级奖品为数组（长度5）。',
        '分类仅可为：功法/武器/装备/法宝/着装/丹药/阵符/特殊。',
        '字段规则：',
        '1) 功法：名称、分类、描述、品阶、出货概率、数量、固定加成；可选：招式（数组，1-3个）。',
        '2) 特殊：名称、分类、描述、品阶、出货概率、数量、内容（数组）。',
        '3) 着装：名称、分类、描述、品阶、出货概率、数量、固定加成、效果、着装类型。',
        '4) 丹药/阵符：名称、分类、描述、品阶、出货概率、数量、效果。',
        '5) 武器/装备/法宝：名称、分类、描述、品阶、出货概率、数量、固定加成、效果。',
        `最高级奖品品阶建议：${poolMeta.highestRank}；次高级奖品品阶建议：${poolMeta.secondaryRank}。`,
        '不要输出解释或代码块。'
      ].join('\n');

      const keywordText = refreshKeyword.trim() ? `主题关键词：${refreshKeyword.trim()}。` : '主题关键词：无。';
      const prompt = [
        wbContents['[仙玉录]天运卜算'] || '',
        wbContents['[数值]物品数值基准'] || '',
        `输出格式要求：\n${outputRules}`,
        `本次刷新要求：\n- 奖池：${poolMeta.label}\n- ${keywordText}`
      ].join('\n\n');

      const retries = Math.max(0, Math.min(10, Number(config.retries) || 0));
      let lastRaw = '';
      let lastError: any = null;
      for (let i = 0; i <= retries; i += 1) {
        try {
          // @ts-ignore - generateRaw is injected by runtime
          lastRaw = await generateRaw({
            user_input: prompt,
            ordered_prompts: ['user_input'],
            custom_api: {
              apiurl: normalizedUrl,
              key: config.key?.trim(),
              model: config.model || 'gpt-4o-mini',
              source: 'openai'
            }
          });
          lastError = null;
          break;
        } catch (error: any) {
          lastError = error;
          if (i === retries) throw error;
        }
      }
      if (lastError) throw lastError;

      const cleaned = (lastRaw || '').trim();
      const jsonText = cleaned.replace(/```json|```/g, '').trim();
      const data = JSON.parse(jsonText);
      const highestRaw = Array.isArray(data?.最高级奖品) ? data.最高级奖品[0] : data?.最高级奖品;
      const highest = highestRaw || {};
      const secondary = Array.isArray(data?.次高级奖品) ? data.次高级奖品 : [];

      const next = klona(draft || mvuData.天运卜算 || {});
      next[refreshPoolKey] = {
        最高级奖品: normalizeLuckItem(highest, poolMeta.highestRank),
        次高级奖品: secondary.map((item: any) => normalizeLuckItem(item, poolMeta.secondaryRank)).slice(0, 5),
      };
      if (!isEditing) setIsEditing(true);
      updateDraft(next);
    } catch (e: any) {
      alert(`刷新失败：${e?.message || '未知错误'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderPrize = (
    item: PrizeItem | null,
    rank: string,
    editing: boolean,
    onUpdate: (field: keyof PrizeItem, value: any) => void,
    onUpdateProb?: (value: number) => void,
  ) => {
    if (!item) {
      return (
        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 italic">
          暂无设置
        </div>
      );
    }

    if (!editing) {
      return (
        <div className="p-4 bg-white border border-emerald-100 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-800">{item.名称 || '未命名物品'}</div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              {rank}
            </span>
          </div>
          <div className="text-xs text-slate-500">出货概率：{item.出货概率 ?? 0}% · 数量：{item.数量 ?? 1}</div>
          <div className="text-xs text-slate-500">分类：{item.分类 || '未知'} · 品阶：{item.品阶 || rank}</div>
          {item.描述 && <div className="text-xs text-slate-600 italic">{item.描述}</div>}
        </div>
      );
    }

    return (
      <div className="p-4 bg-white border border-emerald-100 rounded-2xl shadow-sm space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-500">
            名称
            <input
              value={item.名称 || ''}
              onChange={e => onUpdate('名称', e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs text-slate-500">
            分类
            <input
              value={item.分类 || ''}
              onChange={e => onUpdate('分类', e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs text-slate-500">
            品阶
            <input
              value={item.品阶 || rank}
              onChange={e => onUpdate('品阶', e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs text-slate-500">
            数量
            <input
              type="number"
              value={item.数量 ?? 1}
              onChange={e => onUpdate('数量', Number(e.target.value) || 0)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs text-slate-500">
            出货概率(%)
            <div className="mt-1 flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={item.出货概率 ?? 0}
                onChange={e => onUpdateProb?.(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <input
                type="number"
                value={item.出货概率 ?? 0}
                onChange={e => onUpdateProb?.(parseFloat(e.target.value) || 0)}
                className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right font-mono"
              />
            </div>
          </label>
          <label className="text-xs text-slate-500">
            灵石类型
            <input
              value={item.灵石类型 || ''}
              onChange={e => onUpdate('灵石类型', e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs text-slate-500">
            着装类型
            <input
              value={item.着装类型 || ''}
              onChange={e => onUpdate('着装类型', e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
        </div>

        <label className="text-xs text-slate-500 block">
          描述
          <textarea
            value={item.描述 || ''}
            onChange={e => onUpdate('描述', e.target.value)}
            className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[70px]"
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="text-xs text-slate-500">
            固定加成
            <textarea
              value={stringifyLines(item.固定加成)}
              onChange={e => onUpdate('固定加成', parseLines(e.target.value))}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[70px]"
              placeholder="每行一条"
            />
          </label>
          <label className="text-xs text-slate-500">
            效果
            <textarea
              value={stringifyLines(item.效果)}
              onChange={e => onUpdate('效果', parseLines(e.target.value))}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[70px]"
              placeholder="每行一条"
            />
          </label>
          <label className="text-xs text-slate-500">
            内容
            <textarea
              value={stringifyLines(item.内容)}
              onChange={e => onUpdate('内容', parseLines(e.target.value))}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[70px]"
              placeholder="每行一条"
            />
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col gap-3 border-b border-emerald-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <h2 className="text-xl font-black text-slate-800 tracking-tight">天运卜算</h2>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">已抽奖次数：</span>
            <span className="text-[10px] font-black text-emerald-600">{lotteryCount}</span>
          </div>
          <button
            onClick={() => (isEditing ? saveDraft() : setIsEditing(true))}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-all font-bold text-sm ${
              isEditing
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50'
            }`}
          >
            {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {isEditing ? '保存设置' : '编辑奖池'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-white/70 p-4">
        <div className="text-xs font-bold text-emerald-700 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          奖池刷新
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-xs text-slate-500 sm:col-span-1">
            奖池
            <select
              value={refreshPoolKey}
              onChange={e => setRefreshPoolKey(e.target.value as PoolKey)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"
            >
              {pools.map(pool => (
                <option key={pool.key} value={pool.key}>{pool.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500 sm:col-span-2">
            主题关键词（可选）
            <input
              value={refreshKeyword}
              onChange={e => setRefreshKeyword(e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
              placeholder="如：剑道/合欢/防御/血脉等"
            />
          </label>
        </div>
        <div className="mt-3">
          <button
            onClick={refreshLuckPool}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl border border-emerald-100 bg-white/60 text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-60"
            disabled={isRefreshing}
          >
            {isRefreshing ? '刷新中...' : '刷新奖池'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
        {pools.map(pool => {
          const source = getSource();
          const poolData = ensurePool(pool.key, source);
          return (
            <section key={pool.key} className="bg-white/70 border border-emerald-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800">
                  <Star className={`w-4 h-4 ${pool.accentClass}`} />
                  <h3 className="text-lg font-black">{pool.label}</h3>
                </div>
                {isEditing && (
                  <button
                    onClick={() => resetHighestPrize(pool.key, pool.highestRank)}
                    className="text-xs font-bold text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full hover:bg-emerald-50"
                  >
                    重置最高级奖品
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                  <Crown className="w-4 h-4 text-amber-500" />
                  最高级奖品（{pool.highestRank}）
                </div>
                {(!poolData.最高级奖品 || Object.keys(poolData.最高级奖品).length === 0) ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 italic">
                    暂无最高级奖品
                  </div>
                ) : (
                  <div className="relative">
                    {renderPrize(
                      poolData.最高级奖品,
                      pool.highestRank,
                      !!isEditing,
                      (field, value) => updatePrizeField(pool.key, '最高级奖品', null, field, value),
                      (value) => updateProbability(pool.key, '最高级奖品', null, value),
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                    <Gift className="w-4 h-4 text-emerald-500" />
                    次高级奖品（{pool.secondaryRank}）
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => addSecondaryPrize(pool.key)}
                      className="text-xs font-bold text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full hover:bg-emerald-50"
                    >
                      添加奖品
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {poolData.次高级奖品.length === 0 && (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 italic">
                      暂无次高级奖品
                    </div>
                  )}
                  {poolData.次高级奖品.map((item, idx) => (
                    <div key={`${pool.key}-${idx}`} className="relative">
                      {renderPrize(
                        item,
                        pool.secondaryRank,
                        !!isEditing,
                        (field, value) => updatePrizeField(pool.key, '次高级奖品', idx, field, value),
                        (value) => updateProbability(pool.key, '次高级奖品', idx, value),
                      )}
                      {isEditing && (
                        <button
                          onClick={() => removeSecondaryPrize(pool.key, idx)}
                          className="absolute top-3 right-3 p-1.5 rounded-full bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100"
                          title="删除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default LuckModal;
