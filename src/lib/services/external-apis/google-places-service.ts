/**
 * Google Places API Service
 * Find business information including address, phone, hours, ratings
 * Pricing: $17 per 1000 requests for Place Details
 * Free tier: $200 credit/month (~11,700 requests)
 */

import { ApiKeyService } from '../api-key-service';
import { logger } from '@/lib/logger';

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  types?: string[];
  businessStatus?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress?: string;
  formattedPhoneNumber?: string;
  internationalPhoneNumber?: string;
  website?: string;
  url?: string; // Google Maps URL
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  types?: string[];
  businessStatus?: string;
  openingHours?: {
    openNow?: boolean;
    weekdayText?: string[];
  };
  reviews?: PlaceReview[];
  location?: {
    lat: number;
    lng: number;
  };
}

export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  time: number;
  relativeTimeDescription?: string;
}

export interface GooglePlacesResult {
  success: boolean;
  place?: PlaceDetails;
  searchResults?: PlaceSearchResult[];
  error?: string;
}

const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

/**
 * Google Places API Service for business data enrichment
 */
export class GooglePlacesService {
  /**
   * Search for a business by name and optional location
   */
  static async searchBusiness(
    query: string,
    location?: string
  ): Promise<GooglePlacesResult> {
    try {
      const apiKey = await ApiKeyService.getDecryptedKey('google_places');

      if (!apiKey) {
        return {
          success: false,
          error: 'API key de Google Places no configurada',
        };
      }

      // Build search query with location if provided
      const searchQuery = location ? `${query} ${location}` : query;
      const url = `${PLACES_API_BASE}/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`;

      logger.debug('[GooglePlaces] Searching for business', { query: searchQuery });

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();

      if (data.status === 'REQUEST_DENIED') {
        return { success: false, error: 'API key invalida o sin permisos' };
      }

      if (data.status === 'ZERO_RESULTS') {
        return { success: true, searchResults: [] };
      }

      if (data.status !== 'OK') {
        return { success: false, error: data.error_message || data.status };
      }

      const searchResults: PlaceSearchResult[] = data.results.slice(0, 5).map((place: Record<string, unknown>) => ({
        placeId: place.place_id as string,
        name: place.name as string,
        address: place.formatted_address as string,
        rating: place.rating as number,
        userRatingsTotal: place.user_ratings_total as number,
        types: place.types as string[],
        businessStatus: place.business_status as string,
        location: place.geometry ? {
          lat: (place.geometry as Record<string, unknown>).location ? ((place.geometry as Record<string, unknown>).location as Record<string, number>).lat : undefined,
          lng: (place.geometry as Record<string, unknown>).location ? ((place.geometry as Record<string, unknown>).location as Record<string, number>).lng : undefined,
        } : undefined,
      }));

      logger.debug('[GooglePlaces] Search results', { count: searchResults.length });

      return { success: true, searchResults };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[GooglePlaces] Search error', error instanceof Error ? error : new Error(message));
      return { success: false, error: message };
    }
  }

  /**
   * Get detailed information about a place
   */
  static async getPlaceDetails(placeId: string): Promise<GooglePlacesResult> {
    try {
      const apiKey = await ApiKeyService.getDecryptedKey('google_places');

      if (!apiKey) {
        return {
          success: false,
          error: 'API key de Google Places no configurada',
        };
      }

      const fields = [
        'place_id',
        'name',
        'formatted_address',
        'formatted_phone_number',
        'international_phone_number',
        'website',
        'url',
        'rating',
        'user_ratings_total',
        'price_level',
        'types',
        'business_status',
        'opening_hours',
        'reviews',
        'geometry',
      ].join(',');

      const url = `${PLACES_API_BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

      logger.debug('[GooglePlaces] Getting place details', { placeId });

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();

      if (data.status === 'REQUEST_DENIED') {
        return { success: false, error: 'API key invalida o sin permisos' };
      }

      if (data.status !== 'OK') {
        return { success: false, error: data.error_message || data.status };
      }

      const result = data.result;
      const place: PlaceDetails = {
        placeId: result.place_id,
        name: result.name,
        formattedAddress: result.formatted_address,
        formattedPhoneNumber: result.formatted_phone_number,
        internationalPhoneNumber: result.international_phone_number,
        website: result.website,
        url: result.url,
        rating: result.rating,
        userRatingsTotal: result.user_ratings_total,
        priceLevel: result.price_level,
        types: result.types,
        businessStatus: result.business_status,
        openingHours: result.opening_hours ? {
          openNow: result.opening_hours.open_now,
          weekdayText: result.opening_hours.weekday_text,
        } : undefined,
        reviews: result.reviews?.slice(0, 3).map((review: Record<string, unknown>) => ({
          authorName: review.author_name,
          rating: review.rating,
          text: review.text,
          time: review.time,
          relativeTimeDescription: review.relative_time_description,
        })),
        location: result.geometry?.location ? {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        } : undefined,
      };

      logger.debug('[GooglePlaces] Place details retrieved', {
        name: place.name,
        hasPhone: !!place.formattedPhoneNumber,
        hasWebsite: !!place.website,
      });

      return { success: true, place };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[GooglePlaces] Details error', error instanceof Error ? error : new Error(message));
      return { success: false, error: message };
    }
  }

  /**
   * Search and get details in one call (convenience method)
   */
  static async findBusiness(
    businessName: string,
    location?: string
  ): Promise<GooglePlacesResult> {
    // First, search for the business
    const searchResult = await this.searchBusiness(businessName, location);

    if (!searchResult.success) {
      return searchResult;
    }

    if (!searchResult.searchResults || searchResult.searchResults.length === 0) {
      return {
        success: true,
        searchResults: [],
        error: 'No se encontraron resultados',
      };
    }

    // Get details for the best match (first result)
    const bestMatch = searchResult.searchResults[0];
    const detailsResult = await this.getPlaceDetails(bestMatch.placeId);

    if (!detailsResult.success) {
      // Return search results even if details fail
      return {
        success: true,
        searchResults: searchResult.searchResults,
        error: detailsResult.error,
      };
    }

    return {
      success: true,
      place: detailsResult.place,
      searchResults: searchResult.searchResults,
    };
  }

  /**
   * Map Google Places types to industry categories
   */
  static mapTypesToIndustry(types: string[]): string | null {
    const typeMapping: Record<string, string> = {
      // Professional services
      'accounting': 'Contabilidad',
      'lawyer': 'Legal / Abogados',
      'insurance_agency': 'Seguros',
      'real_estate_agency': 'Bienes Raices',
      'travel_agency': 'Turismo / Viajes',
      'finance': 'Finanzas',
      'bank': 'Banca',

      // Health
      'doctor': 'Salud / Medicina',
      'hospital': 'Salud / Hospitales',
      'pharmacy': 'Farmacia',
      'dentist': 'Odontologia',
      'veterinary_care': 'Veterinaria',
      'health': 'Salud',

      // Tech & Business
      'electronics_store': 'Tecnologia / Electronica',
      'home_goods_store': 'Hogar / Decoracion',
      'furniture_store': 'Muebles',

      // Food & Hospitality
      'restaurant': 'Restaurantes / Gastronomia',
      'cafe': 'Cafeteria',
      'bar': 'Bar / Entretenimiento',
      'lodging': 'Hoteleria',
      'meal_delivery': 'Delivery / Comida',

      // Retail
      'store': 'Retail / Comercio',
      'shopping_mall': 'Centro Comercial',
      'clothing_store': 'Moda / Ropa',
      'shoe_store': 'Calzado',
      'jewelry_store': 'Joyeria',

      // Automotive
      'car_dealer': 'Automotriz / Concesionarios',
      'car_repair': 'Automotriz / Talleres',
      'car_wash': 'Automotriz / Lavado',

      // Education
      'school': 'Educacion',
      'university': 'Educacion Superior',
      'library': 'Biblioteca',

      // Construction & Industry
      'general_contractor': 'Construccion',
      'electrician': 'Servicios Electricos',
      'plumber': 'Plomeria',

      // Beauty & Personal care
      'beauty_salon': 'Belleza / Estetica',
      'hair_care': 'Peluqueria',
      'spa': 'Spa / Bienestar',
      'gym': 'Fitness / Gimnasio',
    };

    for (const type of types) {
      if (typeMapping[type]) {
        return typeMapping[type];
      }
    }

    // Check for general categories
    if (types.includes('establishment')) {
      if (types.includes('food')) return 'Alimentos / Bebidas';
      if (types.includes('health')) return 'Salud';
      if (types.includes('finance')) return 'Finanzas';
    }

    return null;
  }
}
