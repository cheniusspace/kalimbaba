const AMATIC_FONT_URL =
  'https://fonts.googleapis.com/css2?family=Amatic+SC:wght@700&display=swap'

export function loadDecorativeFonts() {
  if (document.getElementById('kalimbaba-amatic-font')) return

  const link = document.createElement('link')
  link.id = 'kalimbaba-amatic-font'
  link.rel = 'stylesheet'
  link.href = AMATIC_FONT_URL
  document.head.appendChild(link)
}
