const dashboardService = require('./dashboard.service');

async function summary(req, res, next) {
  try {
    res.json({ message: 'Dashboard summary', data: await dashboardService.getSummary() });
  } catch (err) {
    next(err);
  }
}

module.exports = { summary };
