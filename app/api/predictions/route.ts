import { NextResponse } from 'next/server'
import { getPredictionCollection } from '../../../lib/mongodb'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

export async function GET() {
  try {
    const collection = await getPredictionCollection()
    const documents = await collection.find({}).project({ _id: 0 }).toArray()
    return NextResponse.json(documents)
  } catch (error) {
    console.error('GET /api/predictions error:', error)
    return NextResponse.json(
      { error: 'No se pudieron cargar los pronósticos', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { matchId, home_team_score, visitor_team_score, user_prediction, status_state } = body

    if (
      typeof matchId !== 'number' ||
      typeof home_team_score !== 'number' ||
      typeof visitor_team_score !== 'number' ||
      typeof status_state !== 'string' ||
      !['home', 'visitor', 'no_realizado'].includes(user_prediction)
    ) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const collection = await getPredictionCollection()
    const result = await collection.updateOne(
      { matchId },
      {
        $set: {
          matchId,
          home_team_score,
          visitor_team_score,
          status_state,
          user_prediction,
        },
      },
      { upsert: true }
    )

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('POST /api/predictions error:', error)
    return NextResponse.json(
      { error: 'No se pudo guardar el pronóstico', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const { matches } = await request.json()

    if (!Array.isArray(matches)) {
      return NextResponse.json({ error: 'Matches inválidos' }, { status: 400 })
    }

    const collection = await getPredictionCollection()

    const operations = matches.map((match) => {
      const matchId = Number(match.id)
      const homeTeamScore = Number(match.home_team_score ?? 0)
      const visitorTeamScore = Number(match.visitor_team_score ?? 0)
      const statusState = String(match.status_state ?? 'scheduled')

      return {
        updateOne: {
          filter: { matchId },
          update: {
            $set: {
              home_team_score: homeTeamScore,
              visitor_team_score: visitorTeamScore,
              status_state: statusState,
            },
            $setOnInsert: {
              matchId,
              status_state: statusState,
              user_prediction: 'no_realizado',
            },
          },
          upsert: true,
        },
      }
    })

    if (operations.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 })
    }

    const result = await collection.bulkWrite(operations)

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('PUT /api/predictions error:', error)
    return NextResponse.json(
      { error: 'No se pudo sincronizar los partidos', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
