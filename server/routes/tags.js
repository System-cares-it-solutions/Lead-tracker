import express from 'express';
import Tag from '../models/Tag.js';
import Lead from '../models/Lead.js';

const router = express.Router();

// GET /api/tags — List all tags with usage counts
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let filter = {};
    if (category) filter.category = category;
    if (search) {
      filter.name = new RegExp(search.trim(), 'i');
    }

    const tags = await Tag.find(filter).sort({ usageCount: -1, name: 1 }).lean();

    // Recalculate usage counts from actual lead data
    for (const tag of tags) {
      const count = await Lead.countDocuments({ tags: tag.name });
      tag.usageCount = count;
    }

    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tags — Create tag
router.post('/', async (req, res) => {
  try {
    const { name, color, category, description, createdBy } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    // Check for duplicate
    const existing = await Tag.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(409).json({ error: 'Tag with this name already exists' });
    }

    const tag = new Tag({
      id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      color: color || '#6366f1',
      category: category || 'custom',
      description: description || '',
      createdBy: createdBy || null,
    });

    await tag.save();
    res.status(201).json(tag);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tags/:id — Update tag
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If name changed, update all leads with old tag name
    const existing = await Tag.findOne({ id }).lean();
    if (existing && updates.name && updates.name !== existing.name) {
      await Lead.updateMany(
        { tags: existing.name },
        { $set: { 'tags.$[elem]': updates.name } },
        { arrayFilters: [{ elem: existing.name }] }
      );
    }

    const tag = await Tag.findOneAndUpdate({ id }, updates, { returnDocument: 'after' });
    if (!tag) return res.status(404).json({ error: 'Tag not found' });

    res.json(tag);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tags/:id — Delete tag
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await Tag.findOne({ id }).lean();

    if (!tag) return res.status(404).json({ error: 'Tag not found' });

    // Remove tag from all leads
    await Lead.updateMany({ tags: tag.name }, { $pull: { tags: tag.name } });

    await Tag.deleteOne({ id });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tags/stats — Tag usage statistics
router.get('/stats', async (req, res) => {
  try {
    const tags = await Tag.find({}).lean();
    const stats = [];

    for (const tag of tags) {
      const count = await Lead.countDocuments({ tags: tag.name });
      const wonCount = await Lead.countDocuments({ tags: tag.name, status: 'Won' });
      const totalValue = await Lead.aggregate([
        { $match: { tags: tag.name } },
        { $group: { _id: null, total: { $sum: '$dealValue' } } },
      ]);

      stats.push({
        ...tag,
        usageCount: count,
        wonCount,
        totalDealValue: totalValue[0]?.total || 0,
        conversionRate: count > 0 ? ((wonCount / count) * 100).toFixed(1) : '0',
      });
    }

    stats.sort((a, b) => b.usageCount - a.usageCount);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
