import { Router } from 'express';
import * as actorController from '../controllers/actor.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(actorController.listActors));
router.post('/', actorController.uploadActorImage, asyncHandler(actorController.createActor));
router.get('/:id', asyncHandler(actorController.getActor));

export default router;
