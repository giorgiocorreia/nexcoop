import { COOPERADO_HTML } from '../content/cooperado-html'
import CoopaibiInteractions from '../CoopaibiInteractions'

// Formulário "Quero ser cooperado" mantém o MESMO HTML/CSS original — só o
// destino do envio muda por baixo (onclick="enviarForm()" continua no
// markup; a função é reimplementada em CoopaibiInteractions pra postar em
// /api/site/coopaibi/interesse em vez de enviar-cooperado.php).
export default function CoopaibiCooperado() {
  return (
    <>
      <link rel="stylesheet" href="/sites/coopaibi/css/style.css" />
      <link rel="stylesheet" href="/sites/coopaibi/css/cooperado.css" />
      <div dangerouslySetInnerHTML={{ __html: COOPERADO_HTML }} />
      <CoopaibiInteractions page="cooperado" slug="coopaibi" />
    </>
  )
}
