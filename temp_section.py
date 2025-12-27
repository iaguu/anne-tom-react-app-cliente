# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/pages/CardapioPage.jsx')
text = path.read_text(encoding='utf-8')
old = '''        <section className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-black">
            Escolha suas pizzas
          </h1>

          <p className="text-base text-slate-600">
            Clique para ver detalhes, montar meio a meio e adicionar extras.
          </p>

          {/* Banner de horário */}
          <div className="text-xs md:text-sm flex flex-wrap gap-2 items-center">
            <span className="px-2 py-1 rounded-full bg-slate-900 text-white text-[11px] uppercase tracking-wide">
              {isOpenNow ? "Aberto agora" : "Fechado no momento"}
            </span>
            <span className="text-slate-600">{OPENING_LABEL}</span>
            {isUsingCachedMenu && (
              <span className="text-[11px] text-amber-600">
                (Usando cardápio salvo no dispositivo)
              </span>
            )}
          </div>

          {/* BUSCA + CATEGORIA */}
          <div className="sticky top-20 z-10 bg-white/90 backdrop-blur border border-slate-200 rounded-2xl px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2.5">
              <span className="text-lg">🔍</span>
              <input
                type="text"
                className="flex-1 bg-transparent outline-none text-sm md:text-base"
                placeholder="Buscar por nome ou ingrediente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="w-full md:w-56 border border-slate-200 text-sm md:text-base px-3 py-2 rounded-full bg-white"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {prettyCategory(c)}
                </option>
              ))}
            </select>
          </div>
        </section>
'''
new = '''        <section className="space-y-6 rounded-[32px] bg-white/90 px-6 py-6 shadow-xl ring-1 ring-slate-200">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={lex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] }
              >
                <span
                  className={h-2 w-2 rounded-full }
                />
                {isOpenNow ? "Aberto agora" : "Fechado no momento"}
              </span>
              <span className="text-xs text-slate-400">{OPENING_LABEL}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900">
              Escolha suas pizzas
            </h1>
            <p className="text-sm text-slate-500">
              Clique para ver detalhes, montar meio a meio e adicionar extras.
            </p>
            {isUsingCachedMenu && (
              <p className="text-[11px] text-amber-600">
                (Usando cardápio salvo no dispositivo)
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
              <span className="text-lg">🔍</span>
              <input
                type="text"
                className="flex-1 bg-transparent text-sm font-medium text-slate-600 outline-none placeholder:text-slate-400"
                placeholder="Buscar por nome ou ingrediente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 rounded-full shadow-sm"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {prettyCategory(c)}
                </option>
              ))}
            </select>
          </div>
        </section>
'''
if old not in text:
    raise SystemExit('old section not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
