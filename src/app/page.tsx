export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
      <p className="mb-8 text-sm font-semibold tracking-widest text-blue-700 uppercase">ObraFlow · Dokimos</p>
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-12">
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800">F01 · Fundação</span>
        <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Uma base para compras com decisões claras.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">A base da aplicação está em preparação. Os fluxos de pedidos, aprovações e configuração de alçadas serão disponibilizados nas próximas etapas.</p>
        <div className="mt-9 border-t border-slate-100 pt-6">
          <h2 className="text-base font-semibold text-slate-900">Verificação do ambiente</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">A página confirma que a aplicação iniciou. A conexão com o banco e o schema são verificados separadamente.</p>
          <a className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700" href="/api/health">Consultar prontidão do banco</a>
        </div>
      </div>
      <p className="mt-6 text-sm leading-6 text-slate-500">Ambiente local de demonstração · Instalação e comandos no README do projeto.</p>
    </main>
  );
}
