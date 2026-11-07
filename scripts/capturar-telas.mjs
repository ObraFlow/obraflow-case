/**
 * Captura as telas do README por CDP: Chrome headless falando com o `next dev` que já está no
 * ar. Node 25 tem WebSocket global, então não há dependência nova — e nenhuma linha do produto
 * muda por causa da captura.
 *
 * Uso: node capturar.mjs <pasta-destino>   (com `npm run dev` e `npm run seed` já feitos)
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { setTimeout as espera } from 'node:timers/promises'

const BASE = 'http://localhost:3000'
const DESTINO = process.argv[2]
const PORTA = 9333

const CAIO = 'cseedusuariocaio00004'
const AMANDA = 'cseedusuarioamanda0002'
const JOAO = 'cseedusuariojoao00003'
const MARINA = 'cseedusuariomarina0001'

const TELAS = [
  { arquivo: 'tela-1-cadastro-de-pedido.png', url: '/pedidos/novo?rascunho=1001', usuario: CAIO },
  { arquivo: 'tela-1-cadastro-vazio.png', url: '/pedidos/novo', usuario: CAIO },
  { arquivo: 'tela-2-aprovacao-lista.png', url: '/pedidos?aba=todos', usuario: AMANDA },
  { arquivo: 'tela-2-aprovacao-fila.png', url: '/pedidos', usuario: AMANDA },
  { arquivo: 'tela-2-aprovacao-detalhe.png', url: '/pedidos/1003', usuario: AMANDA },
  { arquivo: 'tela-3-regras-da-alcada.png', url: '/alcadas?obra=cseedobraaurora000001', usuario: MARINA },
  { arquivo: 'administracao-painel.png', url: '/admin', usuario: MARINA },
  { arquivo: 'empresa-obras.png', url: '/empresa', usuario: MARINA },
  { arquivo: 'empresa-fornecedores.png', url: '/empresa?aba=fornecedores', usuario: MARINA },
  { arquivo: 'snapshot-da-faixa.png', url: '/pedidos/1007', usuario: JOAO },
  { arquivo: 'entrar.png', url: '/entrar', usuario: '' },
  { arquivo: 'tela-2-aprovacao-390px.png', url: '/pedidos', usuario: AMANDA, largura: 390 },
]

mkdirSync(DESTINO, { recursive: true })

const chrome = spawn('google-chrome', [
  '--headless=new', `--remote-debugging-port=${PORTA}`, '--no-sandbox',
  '--hide-scrollbars', '--user-data-dir=' + DESTINO + '/.chrome-perfil', 'about:blank',
], { stdio: 'ignore' })

async function alvo() {
  for (let i = 0; i < 40; i++) {
    try {
      const paginas = (await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json())
        .filter((t) => t.type === 'page')
      if (paginas[0]?.webSocketDebuggerUrl) return paginas[0].webSocketDebuggerUrl
    } catch {}
    await espera(300)
  }
  throw new Error('Chrome não abriu a porta de depuração.')
}

const ws = new WebSocket(await alvo())
await new Promise((ok, erro) => { ws.onopen = ok; ws.onerror = erro })

let sequencia = 0
const pendentes = new Map()
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  const espera = pendentes.get(msg.id)
  if (!espera) return
  pendentes.delete(msg.id)
  if (msg.error) espera.erro(new Error(JSON.stringify(msg.error)))
  else espera.ok(msg.result)
}
const cdp = (method, params = {}) =>
  new Promise((ok, erro) => {
    const id = ++sequencia
    pendentes.set(id, { ok, erro })
    ws.send(JSON.stringify({ id, method, params }))
  })

const avaliar = async (expressao) =>
  (await cdp('Runtime.evaluate', { expression: expressao, returnByValue: true })).result.value

await cdp('Page.enable')
await cdp('Network.enable')

for (const tela of TELAS) {
  const largura = tela.largura ?? 1440
  await cdp('Network.clearBrowserCookies')
  if (tela.usuario) {
    await cdp('Network.setCookie', {
      name: 'obraflow_sessao', value: tela.usuario, domain: 'localhost', path: '/',
    })
  }
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: largura, height: 1200, deviceScaleFactor: 2, mobile: largura < 768,
  })
  await cdp('Page.navigate', { url: BASE + tela.url })
  // O conteúdo das listas chega por fetch depois da primeira pintura, e o `next dev` compila a
  // rota sob demanda na primeira visita. Quatro segundos cobrem as duas coisas.
  await espera(4000)
  // A sobreposição de desenvolvimento do Next não é parte do produto: sai da captura, e só da
  // captura.
  await avaliar(`document.querySelectorAll('nextjs-portal').forEach((n) => n.remove())`)
  await espera(400)

  // A altura sai do conteúdo, não de um palpite: capturar além dele deixaria a imagem com um
  // rodapé vazio. A medida é feita com a janela curta de propósito — numa janela alta,
  // `scrollHeight` devolve a altura da própria janela quando o conteúdo é menor que ela.
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: largura, height: 360, deviceScaleFactor: 2, mobile: largura < 768,
  })
  await espera(400)
  const altura = (await avaliar(`document.documentElement.scrollHeight`)) + 24
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: largura, height: altura, deviceScaleFactor: 2, mobile: largura < 768,
  })
  await espera(400)

  const { data } = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  writeFileSync(`${DESTINO}/${tela.arquivo}`, Buffer.from(data, 'base64'))
  console.log(`${tela.arquivo}  ${largura}×${altura}  ←  ${tela.url}`)
}

ws.close()
chrome.kill()
