export type PredictionStatDocument = {
  user_prediction?: string
  home_team_score?: number | null
  visitor_team_score?: number | null
}

export function calculatePredictionStats(documents: PredictionStatDocument[]) {
  let aciertos = 0
  let desaciertos = 0

  for (const document of documents) {
    const prediction = document.user_prediction
    const homeScore = Number(document.home_team_score ?? 0)
    const visitorScore = Number(document.visitor_team_score ?? 0)

    if (prediction === 'home' && homeScore > visitorScore) {
      aciertos += 1
      continue
    }

    if (prediction === 'visitor' && visitorScore > homeScore) {
      aciertos += 1
      continue
    }

    if (prediction === 'home' || prediction === 'visitor' || prediction === 'no_realizado') {
      desaciertos += 1
    }
  }

  return {
    aciertos,
    desaciertos,
    total: aciertos + desaciertos,
  }
}
