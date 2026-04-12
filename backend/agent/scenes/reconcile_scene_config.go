package scenes

//
//import (
//	"encoding/json"
//	"google.golang.org/protobuf/types/known/structpb"
//	"strings"
//)
//
//// Keps right as source of truth
//// there can be orphans object if the scene is replaced
//// Does not merge arrays, always keep the right one. Which is fine.
//func ReconcileEditsPatch(left *structpb.Struct, right json.RawMessage) (json.RawMessage, error) {
//
//	if left == nil {
//		return right, nil
//	}
//
//	if len(right) == 0 {
//		return json.Marshal(left.AsMap())
//	}
//
//	leftMap := left.AsMap()
//
//	var rightMap map[string]any
//	if err := json.Unmarshal(right, &rightMap); err != nil {
//		return nil, err
//	}
//
//	// workaround: ensure only one scene root
//	for key := range rightMap {
//		if !isRootComponentKey(key) {
//			continue
//		}
//
//		if _, exists := leftMap[key]; !exists {
//			// only remove left scenes if the right scene is different
//			removeAllRootScenes(leftMap)
//		}
//	}
//
//	merged := deepMergeMaps(leftMap, rightMap)
//
//	return json.Marshal(merged)
//}
//
//func removeAllRootScenes(left map[string]any) {
//	for k := range left {
//		//if isRootComponentKey(k) {
//		removeSceneFromLeft(left, k)
//		//}
//	}
//}
//
//func deepMergeMaps(left, right map[string]any) map[string]any {
//	result := make(map[string]any, len(left)+len(right))
//
//	for k, v := range left {
//		result[k] = v
//	}
//
//	for k, rv := range right {
//		lv, exists := result[k]
//
//		if !exists {
//			result[k] = rv
//			continue
//		}
//
//		lmap, lok := lv.(map[string]any)
//		rmap, rok := rv.(map[string]any)
//
//		if lok && rok {
//			result[k] = deepMergeMaps(lmap, rmap)
//		} else {
//			result[k] = rv // right overrides
//		}
//	}
//
//	return result
//}
//
//func isRootComponentKey(key string) bool {
//	parts := strings.Split(key, "-")
//	if len(parts) != 2 {
//		return false
//	}
//
//	//componentID := parts[0]
//
//	//for _, group := range componentGroups {
//	//	for _, comp := range group.Components {
//	//		if comp.ID == componentID {
//	//			return true
//	//		}
//	//	}
//	//}
//
//	return false
//}
//
//func removeSceneFromLeft(left map[string]any, sceneKey string) {
//	for k := range left {
//
//		if k == sceneKey || strings.HasSuffix(k, "-"+sceneKey) {
//			delete(left, k)
//		}
//	}
//}
