import { Router } from 'express';
import * as actorController from '../controllers/actor.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(actorController.listActors));
router.get('/:id', asyncHandler(actorController.getActor));

export default router;
