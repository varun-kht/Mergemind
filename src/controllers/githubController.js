import { runPRReview } from '../mcp/client/orchestrator.js'

export async function handlePRWebhook(req, res) {
  try {
    const { action, repository, pull_request } = req.body

    if (action !== 'opened' && action !== 'synchronize') {
      return res.status(200).send('Event ignored')
    }

    const repo     = repository.full_name
    const prNumber = pull_request.number

    console.log(`Processing PR #${prNumber}`)

    const result = await runPRReview({ repo, prNumber })

    console.log('AI Reviews:', result.reviews)

    res.status(200).json({
      message: 'PR processed and AI review posted',
      reviews: result.reviews
    })

  } catch (error) {
    console.error(error)
    res.status(500).send('Error processing PR')
  }
}