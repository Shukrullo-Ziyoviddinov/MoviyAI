import { Router } from 'express';
import * as countryController from '../controllers/country.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(countryController.listCountries));
router.post('/', asyncHandler(countryController.createCountry));
router.patch('/:id', asyncHandler(countryController.updateCountry));
router.delete('/:id', asyncHandler(countryController.removeCountry));

export default router;
