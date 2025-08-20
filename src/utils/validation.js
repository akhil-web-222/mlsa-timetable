const Joi = require('joi');

const memberSubmitSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  reg_number: Joi.string().trim().min(1).max(50).required(),
  email: Joi.string().email().pattern(/^[A-Za-z0-9._%+-]+@srmist\.edu\.in$/).required(),
  free_slots: Joi.array().items(
    Joi.object({
      day: Joi.number().integer().min(1).max(5).required(),
      slot: Joi.number().integer().min(1).max(10).required()
    })
  ).unique((a, b) => a.day === b.day && a.slot === b.slot).required()
});

const adminLoginSchema = Joi.object({
  username: Joi.string().trim().min(1).required(),
  password: Joi.string().min(1).required()
});

const adminMembersQuerySchema = Joi.object({
  search: Joi.string().allow('').optional(),
  day: Joi.number().integer().min(1).max(5).optional(),
  slot: Joi.number().integer().min(1).max(10).optional(),
  locked: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

const exportQuerySchema = Joi.object({
  scope: Joi.string().valid('all', 'day').default('all'),
  day: Joi.when('scope', {
    is: 'day',
    then: Joi.number().integer().min(1).max(5).required(),
    otherwise: Joi.number().integer().min(1).max(5).optional()
  })
});

module.exports = {
  memberSubmitSchema,
  adminLoginSchema,
  adminMembersQuerySchema,
  exportQuerySchema
};
