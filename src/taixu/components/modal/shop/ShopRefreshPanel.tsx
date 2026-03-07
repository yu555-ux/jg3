import { ShoppingBag, X } from 'lucide-react';
import React from 'react';
import { CLOTHING_TYPES, RANKS } from './constants';

interface ShopRefreshPanelProps {
  categories: readonly string[];
  itemCategories: readonly string[];
  isGenerating: boolean;
  refreshTypes: string[];
  refreshCount: number;
  refreshKeyword: string;
  eroticCount: number;
  eroticKeyword: string;
  rankCounts: Record<(typeof RANKS)[number], number>;
  mustHaveEnabled: boolean;
  mustHaveForm: any;
  onClose: () => void;
  onToggleRefreshType: (type: string) => void;
  onRefreshCountChange: (value: number) => void;
  onRefreshKeywordChange: (value: string) => void;
  onEroticCountChange: (value: number) => void;
  onEroticKeywordChange: (value: string) => void;
  onRankCountsChange: (value: Record<(typeof RANKS)[number], number>) => void;
  onToggleMustHave: () => void;
  onMustHaveFormChange: (value: any) => void;
  onQuickRefresh: () => void;
}

const ShopRefreshPanel: React.FC<ShopRefreshPanelProps> = ({
  categories,
  itemCategories,
  isGenerating,
  refreshTypes,
  refreshCount,
  refreshKeyword,
  eroticCount,
  eroticKeyword,
  rankCounts,
  mustHaveEnabled,
  mustHaveForm,
  onClose,
  onToggleRefreshType,
  onRefreshCountChange,
  onRefreshKeywordChange,
  onEroticCountChange,
  onEroticKeywordChange,
  onRankCountsChange,
  onToggleMustHave,
  onMustHaveFormChange,
  onQuickRefresh,
}) => (
  <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
    <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-slate-50/30 mb-6">
      <h3 className="text-xl font-bold text-slate-800">刷新商品</h3>
      <button onClick={onClose} className="p-2 hover:bg-rose-50 rounded-full transition-colors text-slate-400 hover:text-rose-500">
        <X className="w-6 h-6" />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-8 custom-scrollbar">
      <div className="space-y-3">
        <label className="text-sm font-black text-slate-500 uppercase tracking-widest">刷新类型（可多选）</label>
        <div className="grid grid-cols-3 gap-3">
          {categories.map(category => {
            const selected = refreshTypes.includes(category);
            return (
              <button
                key={category}
                onClick={() => onToggleRefreshType(category)}
                className={`py-3 rounded-2xl font-bold border-2 transition-all flex flex-col items-center gap-2 ${selected
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-100 scale-105'
                  : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30'}`}
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="text-xs">{category}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-black text-slate-500 uppercase tracking-widest">刷新数量</label>
          <span className="text-xs font-black text-emerald-600 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
            {refreshCount} 个
          </span>
        </div>
        <div className="flex items-center gap-6">
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={refreshCount}
            onChange={event => onRefreshCountChange(Number(event.target.value))}
            className="flex-1 h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center">
            <span className="text-xl font-black text-emerald-700">{refreshCount}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-black text-slate-500 uppercase tracking-widest">主题关键词（可选）</label>
        <input
          type="text"
          value={refreshKeyword}
          onChange={event => onRefreshKeywordChange(event.target.value)}
          placeholder="如：火系、妖族、仙宫遗物"
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all"
        />
      </div>

      <div className="space-y-4">
        <label className="text-sm font-black text-slate-500 uppercase tracking-widest">品阶数量（可选）</label>
        <div className="grid grid-cols-3 gap-3">
          {RANKS.map(rank => (
            <div key={rank} className="space-y-1">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">必须出现{rank}阶商品</div>
              <input
                type="number"
                min={0}
                value={rankCounts[rank]}
                onChange={event => onRankCountsChange({ ...rankCounts, [rank]: Math.max(0, Number(event.target.value)) })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-black text-slate-500 uppercase tracking-widest">色情商品数量</label>
          <span className="text-xs font-black text-emerald-600 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
            {eroticCount} 个
          </span>
        </div>
        <div className="flex items-center gap-6">
          <input
            type="range"
            min={0}
            max={refreshCount}
            step={1}
            value={eroticCount}
            onChange={event => onEroticCountChange(Math.max(0, Number(event.target.value)))}
            className="flex-1 h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center">
            <span className="text-xl font-black text-emerald-700">{eroticCount}</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-400">
          约束：涉及性爱/调教/欲望等主题
        </div>
        {eroticCount > 0 && (
          <input
            type="text"
            value={eroticKeyword}
            onChange={event => onEroticKeywordChange(event.target.value)}
            placeholder="色情关键词（可选，如：调教、媚药、束缚）"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all"
          />
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-black text-slate-500 uppercase tracking-widest">必定出现商品</label>
          <button
            onClick={onToggleMustHave}
            className={`px-4 py-1.5 rounded-full border text-xs font-black transition-all ${mustHaveEnabled
              ? 'bg-emerald-500 text-white border-emerald-400'
              : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-200'}`}
          >
            {mustHaveEnabled ? '已开启' : '未开启'}
          </button>
        </div>

        {mustHaveEnabled && (
          <div className="space-y-4 p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">名称</label>
                <input
                  type="text"
                  value={mustHaveForm.名称}
                  onChange={event => onMustHaveFormChange({ ...mustHaveForm, 名称: event.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">分类</label>
                <select
                  value={mustHaveForm.分类}
                  onChange={event => onMustHaveFormChange({ ...mustHaveForm, 分类: event.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                >
                  {itemCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            {mustHaveForm.分类 === '着装' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">着装类型</label>
                <select
                  value={mustHaveForm.着装类型}
                  onChange={event => onMustHaveFormChange({ ...mustHaveForm, 着装类型: event.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                >
                  {CLOTHING_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">价格</label>
                <input
                  type="number"
                  value={mustHaveForm.价格}
                  onChange={event => onMustHaveFormChange({ ...mustHaveForm, 价格: Number(event.target.value) })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">数量</label>
                <input
                  type="number"
                  min={1}
                  value={mustHaveForm.数量}
                  onChange={event => onMustHaveFormChange({ ...mustHaveForm, 数量: Math.max(1, Number(event.target.value) || 1) })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">品阶</label>
                <input
                  type="text"
                  value={mustHaveForm.品阶}
                  onChange={event => onMustHaveFormChange({ ...mustHaveForm, 品阶: event.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">描述</label>
              <textarea
                value={mustHaveForm.描述}
                onChange={event => onMustHaveFormChange({ ...mustHaveForm, 描述: event.target.value })}
                rows={2}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              {['功法', '武器', '装备', '法宝', '着装'].includes(mustHaveForm.分类) && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">固定加成（每行一条）</label>
                  <textarea
                    value={mustHaveForm.固定加成文本}
                    onChange={event => onMustHaveFormChange({ ...mustHaveForm, 固定加成文本: event.target.value })}
                    rows={2}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden font-mono text-xs"
                  />
                </div>
              )}
              {mustHaveForm.分类 === '功法' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">招式（每行一条）</label>
                  <textarea
                    value={mustHaveForm.招式文本}
                    onChange={event => onMustHaveFormChange({ ...mustHaveForm, 招式文本: event.target.value })}
                    rows={3}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden text-xs"
                    placeholder="格式：招式名 | 描述 | 效果1;效果2"
                  />
                </div>
              )}
              {['武器', '装备', '法宝', '着装', '丹药', '阵符'].includes(mustHaveForm.分类) && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">效果（每行一条）</label>
                  <textarea
                    value={mustHaveForm.效果文本}
                    onChange={event => onMustHaveFormChange({ ...mustHaveForm, 效果文本: event.target.value })}
                    rows={2}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                  />
                </div>
              )}
              {mustHaveForm.分类 === '特殊' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">内容（每行一条）</label>
                  <textarea
                    value={mustHaveForm.内容文本}
                    onChange={event => onMustHaveFormChange({ ...mustHaveForm, 内容文本: event.target.value })}
                    rows={2}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex w-full gap-4 pt-2">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-2xl border-2 border-slate-100 text-slate-400 font-black hover:bg-slate-50 transition-all"
        >
          罢休
        </button>
        <button
          onClick={onQuickRefresh}
          disabled={isGenerating}
          className={`flex-1 py-3 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-600 text-white font-black shadow-xl shadow-emerald-100 hover:shadow-emerald-200 hover:-translate-y-1 transition-all active:scale-95 ${isGenerating ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {isGenerating ? '刷新中...' : '重构因果'}
        </button>
      </div>
    </div>
  </div>
);

export default ShopRefreshPanel;
