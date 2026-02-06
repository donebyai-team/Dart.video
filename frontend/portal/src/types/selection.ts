/**
 * Unified Selection System
 * 
 * This module provides a type-safe way to represent and work with selections
 * in the editor. Instead of managing multiple state variables (selectedSlide,
 * selectedEffectId, selectedStackItemId), we use a single EntityId that
 * encodes the type and hierarchy of the selected entity.
 */

export type EntityType = 'slide' | 'stack-item' | 'overlay' | 'stack-item-overlay';

export type EntityId = string; // Format: "slide:id" | "slide:id:item:id" | "slide:id:overlay:id" | "slide:id:item:id:overlay:id"

export interface ParsedEntity {
  type: EntityType;
  slideId: string;
  itemId?: string;
  overlayId?: string;
}

/**
 * Parse an entity ID into its components
 */
export function parseEntityId(id: string): ParsedEntity {
  const parts = id.split(':');
  
  if (parts.length === 2 && parts[0] === 'slide') {
    return { 
      type: 'slide', 
      slideId: parts[1] 
    };
  }
  
  if (parts.length === 4 && parts[0] === 'slide' && parts[2] === 'item') {
    return { 
      type: 'stack-item', 
      slideId: parts[1], 
      itemId: parts[3] 
    };
  }
  
  if (parts.length === 4 && parts[0] === 'slide' && parts[2] === 'overlay') {
    return { 
      type: 'overlay', 
      slideId: parts[1], 
      overlayId: parts[3] 
    };
  }
  
  // New: Handle overlays on stack items
  if (parts.length === 6 && parts[0] === 'slide' && parts[2] === 'item' && parts[4] === 'overlay') {
    return { 
      type: 'stack-item-overlay', 
      slideId: parts[1], 
      itemId: parts[3],
      overlayId: parts[5]
    };
  }
  
  throw new Error(`Invalid entity ID format: ${id}`);
}

/**
 * Create an entity ID for a slide
 */
export function createSlideEntityId(slideId: string): EntityId {
  return `slide:${slideId}`;
}

/**
 * Create an entity ID for a stack item
 */
export function createStackItemEntityId(slideId: string, itemId: string): EntityId {
  return `slide:${slideId}:item:${itemId}`;
}

/**
 * Create an entity ID for an overlay (effect or annotation)
 */
export function createOverlayEntityId(slideId: string, overlayId: string): EntityId {
  return `slide:${slideId}:overlay:${overlayId}`;
}

/**
 * Create an entity ID for an overlay on a stack item
 */
export function createStackItemOverlayEntityId(slideId: string, itemId: string, overlayId: string): EntityId {
  return `slide:${slideId}:item:${itemId}:overlay:${overlayId}`;
}

/**
 * Check if an entity ID represents a slide
 */
export function isSlideEntity(id: string): boolean {
  try {
    const parsed = parseEntityId(id);
    return parsed.type === 'slide';
  } catch {
    return false;
  }
}

/**
 * Check if an entity ID represents a stack item
 */
export function isStackItemEntity(id: string): boolean {
  try {
    const parsed = parseEntityId(id);
    return parsed.type === 'stack-item';
  } catch {
    return false;
  }
}

/**
 * Check if an entity ID represents an overlay
 */
export function isOverlayEntity(id: string): boolean {
  try {
    const parsed = parseEntityId(id);
    return parsed.type === 'overlay';
  } catch {
    return false;
  }
}

/**
 * Check if an entity ID represents an overlay on a stack item
 */
export function isStackItemOverlayEntity(id: string): boolean {
  try {
    const parsed = parseEntityId(id);
    return parsed.type === 'stack-item-overlay';
  } catch {
    return false;
  }
}

/**
 * Get the slide ID from any entity ID
 */
export function getSlideIdFromEntity(id: string): string {
  const parsed = parseEntityId(id);
  return parsed.slideId;
}
