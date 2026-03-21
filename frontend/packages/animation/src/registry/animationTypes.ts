import { COMPONENT_REGISTRY, ComponentRegistration } from './components';

/** Get all components available for a given animation type. */
export function getComponentsForType(): ComponentRegistration[] {
  return COMPONENT_REGISTRY;
}
