export default function Logo({ tamanho = 56 }) {
  return (
    <div className="logo">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} width={tamanho} height={tamanho} alt="" />
      <span>Rota Fácil</span>
    </div>
  )
}
