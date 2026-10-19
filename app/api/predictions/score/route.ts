import { NextResponse } from 'next/server'
import { getPredictionCollection } from '../../../../lib/mongodb'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

export async function GET() {
  try {
    const collection = await getPredictionCollection()

    const totals = await collection
      .aggregate([
        {
          $match: {
            status_state: 'final',
          },
        },
        {
          $project: {
            _id: 0,
            user_prediction: 1,
            home_team_score: 1,
            visitor_team_score: 1,
            is_acierto: {
              $cond: [
                {
                  $or: [
                    {
                      $and: [
                        { $eq: ['$user_prediction', 'home'] },
                        { $gt: ['$home_team_score', '$visitor_team_score'] },
                      ],
                    },
                    {
                      $and: [
                        { $eq: ['$user_prediction', 'visitor'] },
                        { $gt: ['$visitor_team_score', '$home_team_score'] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
            is_desacierto: {
              $cond: [
                {
                  $or: [
                    {
                      $and: [
                        { $eq: ['$user_prediction', 'home'] },
                        { $gt: ['$home_team_score', '$visitor_team_score'] },
                      ],
                    },
                    {
                      $and: [
                        { $eq: ['$user_prediction', 'visitor'] },
                        { $gt: ['$visitor_team_score', '$home_team_score'] },
                      ],
                    },
                  ],
                },
                0,
                1,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            aciertos: { $sum: '$is_acierto' },
            desaciertos: { $sum: '$is_desacierto' },
          },
        },
      ])
      .toArray()

    const summary = totals[0] ?? { aciertos: 0, desaciertos: 0 }

    return NextResponse.json({
      aciertos: Number(summary.aciertos ?? 0),
      desaciertos: Number(summary.desaciertos ?? 0),
    })
  } catch (error) {
    console.error('GET /api/predictions/score error:', error)
    return NextResponse.json(
      { error: 'No se pudo calcular el puntaje', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}