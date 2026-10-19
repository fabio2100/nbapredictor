import { NextResponse } from 'next/server'
import sampleData from '../../../responseexample.json'

export async function GET() {
  const isDevelopmentMode = String(process.env.DEVELOPMENT_MODE ?? '').toLowerCase() === 'true'

  if (isDevelopmentMode) {
    return NextResponse.json(sampleData, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30',
      },
    })
  }

  const apiKey = process.env.BALLDONTLIE_API_KEY

  if (!apiKey || apiKey === 'your_api_key_here') {
    return NextResponse.json(
      {
        error:
          'API key no configurada. Registrate gratis en football-data.org y agregá tu clave en .env.local como FOOTBALL_DATA_API_KEY',
      },
      { status: 503 }
    )
  }

  try {
    const today = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const dates = Array.from({ length: 5 }, (_, i) => {
      const dt = new Date(today)
      dt.setDate(today.getDate() + i - 2)
      return formatDate(dt)
    })

    const params = new URLSearchParams()
    params.append('seasons[]', '2026')
    params.append('seasons[]', '2027')
    dates.forEach((d) => params.append('dates[]', d))

    const endpoint = `https://api.balldontlie.io/v1/games?${params.toString()}`

    const res = await fetch(endpoint, {
      headers: { Authorization: apiKey },
    })

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json(
        { error: `Error de la API (${res.status}): ${body}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data, {
      headers: {
        // La CDN de Vercel (s-maxage) y el browser (max-age) cachean 30 s;
        // pasado ese tiempo siguen sirviendo el valor mientras revalidan (swr)
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo conectar con la API de fútbol' },
      { status: 500 }
    )
  }
}
