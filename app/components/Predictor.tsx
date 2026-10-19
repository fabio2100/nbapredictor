'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

type Prediction = 'HOME' | 'AWAY'
type StoredPrediction = 'home' | 'visitor' | 'no_realizado'

interface Team {
  id: number
  full_name: string
  abbreviation: string
}

interface Match {
  id: number
  date: string
  datetime: string
  status: string
  status_state: string
  home_team_score: number | null
  visitor_team_score: number | null
  home_team: Team
  visitor_team: Team
}

const REFRESH_INTERVAL = 60_000 // 60 seconds

const normalizeStoredPrediction = (value?: string): Prediction | undefined => {
  if (value === 'home') return 'HOME'
  if (value === 'visitor') return 'AWAY'
  return undefined
}

const mapPredictionToStored = (value?: Prediction): StoredPrediction => {
  if (value === 'HOME') return 'home'
  if (value === 'AWAY') return 'visitor'
  return 'no_realizado'
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programado',
  in_progress: 'En juego',
  final: 'Finalizado',
}

function isEditable(statusState: string): boolean {
  return statusState?.toLowerCase() !== 'final'
}

function getActualResult(match: Match): Prediction | null {
  if (match.status_state?.toLowerCase() !== 'final') return null
  const home = match.home_team_score ?? 0
  const away = match.visitor_team_score ?? 0
  if (home > away) return 'HOME'
  if (away > home) return 'AWAY'
  return null
}

// ─── Match Card ────────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: Match
  prediction: Prediction | undefined
  savedPrediction: Prediction | undefined
  onPredict: (matchId: number, prediction: Prediction) => void
  ref?: React.RefObject<HTMLDivElement | null>
  isFirstNonFinished?: boolean
}

function MatchCard({ match, prediction, savedPrediction, onPredict, ref, isFirstNonFinished }: MatchCardProps) {
  const editable = isEditable(match.status_state)
  const result = getActualResult(match)

  const isCorrect =
    match.status_state?.toLowerCase() === 'final' &&
    savedPrediction !== undefined &&
    result === savedPrediction

  const isWrong =
    match.status_state?.toLowerCase() === 'final' &&
    savedPrediction !== undefined &&
    result !== savedPrediction

  const isLive = match.status_state?.toLowerCase() === 'in_progress'

  const date = new Date(match.datetime || match.date)
  const dateStr = date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const timeStr = date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const showScore =
    (match.status_state?.toLowerCase() === 'final' || isLive) &&
    match.home_team_score !== null

  const cardBorder = isCorrect
    ? 'border-emerald-300 dark:border-emerald-700'
    : isWrong
    ? 'border-red-300 dark:border-red-700'
    : 'border-zinc-200 dark:border-zinc-700'

  const cardBg = isCorrect
    ? 'bg-emerald-50 dark:bg-emerald-950/40'
    : isWrong
    ? 'bg-red-50 dark:bg-red-950/40'
    : 'bg-white dark:bg-zinc-900'

  return (
    <div ref={ref} className={`rounded-xl border ${cardBorder} ${cardBg} p-4 transition-colors ${isFirstNonFinished ? 'scroll-mt-64' : ''}`}>
      {/* Header row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            match.status_state?.toLowerCase() === 'final'
              ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              : isLive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300 animate-pulse'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
          }`}
        >
          {STATUS_LABEL[match.status_state?.toLowerCase() ?? match.status] ?? match.status}
        </span>
        <span className="text-xs text-zinc-400 ml-auto">
          {dateStr} · {timeStr}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Teams + score */}
        <div className="flex-1 flex items-center gap-3">
          {/* Home */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 text-right leading-tight">
              {match.home_team.full_name}
            </span>
          </div>

          {/* Score / VS */}
          <div className="text-center min-w-[56px] flex-shrink-0">
            {showScore ? (
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {match.home_team_score}&nbsp;–&nbsp;{match.visitor_team_score}
                </span>
              </div>
            ) : (
              <span className="text-sm text-zinc-400 font-medium">vs</span>
            )}
          </div>

          {/* Away */}
          <div className="flex items-center gap-2 flex-1">
            <span className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 leading-tight">
              {match.visitor_team.full_name}
            </span>
          </div>
        </div>

        {/* Prediction buttons */}
        <div className="flex gap-2 sm:flex-col sm:gap-1.5 sm:min-w-[108px]">
          {(['HOME', 'AWAY'] as Prediction[]).map((opt) => {
            const label = opt === 'HOME' ? 'Local' : 'Visitante'
            const isSelected = prediction === opt

            let btnClass = 'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 text-center flex-1 sm:flex-none '

            if (!editable) {
              btnClass += 'cursor-not-allowed '
              if (isSelected && result === opt) {
                btnClass += 'bg-emerald-500 border-emerald-500 text-white '
              } else if (isSelected && result !== opt) {
                btnClass += 'bg-red-400 border-red-400 text-white '
              } else if (result === opt && match.status_state?.toLowerCase() === 'final') {
                btnClass += 'bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-600 dark:text-emerald-300 opacity-70 '
              } else {
                btnClass += 'bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-400 opacity-50 '
              }
            } else {
              if (isSelected) {
                btnClass += 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-900 '
              } else {
                btnClass += 'bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 '
              }
            }

            return (
              <label key={opt} className={btnClass}>
                <input
                  type="radio"
                  name={`match-${match.id}`}
                  value={opt}
                  checked={isSelected}
                  disabled={!editable}
                  onChange={() => onPredict(match.id, opt)}
                  className="sr-only"
                />
                {label}
              </label>
            )
          })}
        </div>
      </div>

      {/* Result feedback */}
      {isCorrect && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2 text-center">
          ✓ +1 punto
        </p>
      )}
      {isWrong && (
        <p className="text-xs text-red-500 font-semibold mt-2 text-center">
          ✗ Sin puntos
        </p>
      )}
    </div>
  )
}

// ─── Main Predictor Component ──────────────────────────────────────────────────

export default function Predictor() {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({})
  const [savedPredictions, setSavedPredictions] = useState<Record<number, Prediction>>({})
  const [scoreSummary, setScoreSummary] = useState({ aciertos: 0, desaciertos: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchScoreSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/predictions/score')
      if (!res.ok) return

      const data = (await res.json()) as { aciertos?: number; desaciertos?: number }
      setScoreSummary({
        aciertos: Number(data.aciertos ?? 0),
        desaciertos: Number(data.desaciertos ?? 0),
      })
    } catch {
      setScoreSummary({ aciertos: 0, desaciertos: 0 })
    }
  }, [])

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/matches')
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        const nextMatches = data.data ?? []
        setMatches(nextMatches)
        setLastUpdated(new Date())
        setError(null)

        try {
          await fetch('/api/predictions', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ matches: nextMatches }),
          })

          await fetchScoreSummary()
        } catch {
          // no-op: se intenta sincronizar en segundo plano
        }
      }
    } catch {
      setError('No se pudo cargar la lista de partidos')
    } finally {
      setLoading(false)
    }
  }, [fetchScoreSummary])

  const fetchSavedPredictions = useCallback(async () => {
    try {
      const res = await fetch('/api/predictions')
      if (!res.ok) return

      const data = (await res.json()) as Array<{ matchId: number; user_prediction?: string }>
      const parsed = Object.fromEntries(
        data
          .map((item) => [item.matchId, normalizeStoredPrediction(item.user_prediction)] as const)
          .filter(([, prediction]) => prediction !== undefined)
      ) as Record<number, Prediction>

      setPredictions(parsed)
      setSavedPredictions(parsed)
    } catch {
      // ignore fetch errors for initial load
    }
  }, [])

  useEffect(() => {
    fetchScoreSummary()
    fetchSavedPredictions()
    fetchMatches()
  }, [fetchScoreSummary, fetchSavedPredictions, fetchMatches])

  // Auto-refresh while there are live matches
  useEffect(() => {
    const hasLive = matches.some((m) => m.status_state?.toLowerCase() === 'in_progress')
    if (!hasLive) return

    const interval = setInterval(fetchMatches, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [matches, fetchMatches])

  const handlePrediction = async (matchId: number, prediction: Prediction) => {
    const match = matches.find((item) => item.id === matchId)
    if (!match || !isEditable(match.status_state)) return

    const payload = {
      matchId,
      home_team_score: match.home_team_score ?? 0,
      visitor_team_score: match.visitor_team_score ?? 0,
      status_state: match.status_state,
      user_prediction: mapPredictionToStored(prediction),
    }

    try {
      await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      await fetchScoreSummary()
    } catch {
      setError('No se pudo guardar el pronóstico')
      return
    }

    setPredictions((prev) => {
      const updated = { ...prev, [matchId]: prediction }
      setSavedPredictions(updated)
      return updated
    })
  }

  // ── Ref for first non-finished match ────────────────────────────────────────
  const firstNonFinishedRef = useRef<HTMLDivElement>(null)

  // Scroll to first non-finished match when matches load
  useEffect(() => {
    if (firstNonFinishedRef.current && !loading) {
      setTimeout(() => {
        firstNonFinishedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [loading])

  // ── Points calculation ──────────────────────────────────────────────────────
  const totalPredictions = Object.keys(predictions).length

  const aciertos = scoreSummary.aciertos || 0
  const desaciertos = scoreSummary.desaciertos || 0

  // ── Group matches by date ──────────────────────────────────────────────────
  const groupedByStage = matches.reduce<Record<string, Match[]>>((acc, match) => {
    const key = match.date || new Date(match.datetime).toISOString().slice(0, 10)
    if (!acc[key]) acc[key] = []
    acc[key].push(match)
    return acc
  }, {})

  const firstNonFinishedMatchId = matches.find((m) => m.status_state?.toLowerCase() !== 'final')?.id
  // ── Score board background color ───────────────────────────────────────────
  let scoreBoardBg = 'from-emerald-500 to-teal-700'
  if (desaciertos > aciertos) {
    scoreBoardBg = 'from-rose-500 to-red-700'
  } else if (aciertos === desaciertos) {
    scoreBoardBg = 'from-amber-400 to-amber-600'
  }


  // ── Main render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="h-10 w-10 rounded-full border-4 border-zinc-300 border-t-zinc-700 animate-spin" />
        <p className="text-zinc-500 text-sm">Cargando partidos de la nba 26 27</p>
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    const isKeyError = error.toLowerCase().includes('api key') || error.toLowerCase().includes('clave')
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-6 text-center">
        <p className="font-semibold text-red-800 dark:text-red-300 mb-2">
          No se pudieron cargar los partidos
        </p>
        <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
        {isKeyError && (
          <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
            <p>
              1. Registrate gratis en{' '}
              <a
                href="https://www.football-data.org/client/register"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                football-data.org
              </a>
            </p>
            <p>
              2. Copiá tu clave en <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">.env.local</code>
            </p>
            <p>
              3. Reiniciá el servidor con{' '}
              <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">npm run dev</code>
            </p>
          </div>
        )}
        <button
          onClick={fetchMatches}
          className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (matches.length === 0) {
    return (
      <p className="text-center text-zinc-500 py-16">
        No se encontraron partidos para la NBA 2026-2027.
      </p>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Score board */}
      <div className={`sticky top-2 z-50 mb-6 rounded-2xl bg-gradient-to-br ${scoreBoardBg} p-6 text-white text-center shadow-lg`}>
        <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1">
          Tu puntaje
        </p>
        <p className="text-6xl font-black tabular-nums leading-none">
          {`${aciertos} - ${desaciertos}`}
        </p>
        <p className="text-2xl opacity-80 mt-2">
          Aciertos · Desaciertos
        </p>
      </div>

      {/* Actions bar */}
      <div className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        {totalPredictions > 0 ? (
          <span>
            {totalPredictions} pronóstico{totalPredictions !== 1 ? 's' : ''} registrado{totalPredictions !== 1 ? 's' : ''}
          </span>
        ) : (
          <span>Seleccioná tus pronósticos</span>
        )}
        {lastUpdated && (
          <span className="ml-2 text-zinc-400 dark:text-zinc-600 text-xs">
            · Actualizado{' '}
            {lastUpdated.toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>

      {/* Matches grouped por fecha */}
      <div className="space-y-10">
        {Object.keys(groupedByStage)
          .sort()
          .map((dateKey) => {
            const d = new Date(dateKey)
            const header = d.toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })
            return (
              <section key={dateKey}>
                <h2 className="text-base font-bold text-zinc-700 dark:text-zinc-300 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-700">
                  {header}
                </h2>
                <div className="space-y-3">
                  {groupedByStage[dateKey].map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={predictions[match.id]}
                      savedPrediction={savedPredictions[match.id]}
                      onPredict={handlePrediction}
                      ref={match.id === firstNonFinishedMatchId ? firstNonFinishedRef : undefined}
                      isFirstNonFinished={match.id === firstNonFinishedMatchId}
                    />
                  ))}
                </div>
              </section>
            )
          })}
      </div>
    </div>
  )
}
