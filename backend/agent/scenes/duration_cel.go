package scenes

import (
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/google/cel-go/cel"
	"github.com/google/cel-go/common/types"
	"github.com/google/cel-go/common/types/ref"
)

const defaultDurationFrames int32 = 90

func (s SceneConfig) ComputeDurationFrames() int32 {
	if strings.TrimSpace(s.DurationExpression) == "" {
		return defaultDurationFrames
	}

	value, err := evaluateDurationExpression(s.DurationExpression, s.durationExpressionProps())
	if err != nil {
		return defaultDurationFrames
	}

	frames, ok := numericToInt32(value)
	if !ok || frames <= 0 {
		return defaultDurationFrames
	}

	return frames
}

func evaluateDurationExpression(expression string, props map[string]any) (any, error) {
	env, err := cel.NewEnv(
		cel.Variable("props", cel.MapType(cel.StringType, cel.DynType)),
		cel.Function("max",
			cel.Overload("duration_max_dyn_dyn", []*cel.Type{cel.DynType, cel.DynType}, cel.IntType,
				cel.BinaryBinding(func(lhs, rhs ref.Val) ref.Val {
					left, ok := numericRefToFloat64(lhs)
					if !ok {
						return types.NewErr("max expects numeric input")
					}

					right, ok := numericRefToFloat64(rhs)
					if !ok {
						return types.NewErr("max expects numeric input")
					}

					return types.Int(int64(math.Max(left, right)))
				}),
			),
		),

		cel.Function("min",
			cel.Overload("duration_min_dyn_dyn", []*cel.Type{cel.DynType, cel.DynType}, cel.IntType,
				cel.BinaryBinding(func(lhs, rhs ref.Val) ref.Val {
					left, ok := numericRefToFloat64(lhs)
					if !ok {
						return types.NewErr("min expects numeric input")
					}

					right, ok := numericRefToFloat64(rhs)
					if !ok {
						return types.NewErr("min expects numeric input")
					}

					return types.Int(int64(math.Min(left, right)))
				}),
			),
		),

		cel.Function("abs",
			cel.Overload("duration_abs_dyn", []*cel.Type{cel.DynType}, cel.IntType,
				cel.UnaryBinding(func(arg ref.Val) ref.Val {
					n, ok := numericRefToFloat64(arg)
					if !ok {
						return types.NewErr("abs expects numeric input")
					}

					return types.Int(int64(math.Abs(n)))
				}),
			),
		),

		cel.Function("log10",
			cel.Overload("duration_log10_dyn", []*cel.Type{cel.DynType}, cel.IntType,
				cel.UnaryBinding(func(arg ref.Val) ref.Val {
					n, ok := numericRefToFloat64(arg)
					if !ok {
						return types.NewErr("log10 expects numeric input")
					}

					if n <= 0 {
						return types.NewErr("log10 expects positive input")
					}

					return types.Int(int64(math.Log10(n)))
				}),
			),
		),

		cel.Function("segmentCount",
			cel.Overload("segment_count_string_string",
				[]*cel.Type{cel.StringType, cel.StringType},
				cel.IntType,
				cel.BinaryBinding(func(textVal, modeVal ref.Val) ref.Val {

					text, ok := textVal.Value().(string)
					if !ok {
						return types.NewErr("segmentCount text must be string")
					}

					mode, ok := modeVal.Value().(string)
					if !ok {
						return types.NewErr("segmentCount mode must be string")
					}

					switch mode {

					case "char":
						return types.Int(len([]rune(text)))

					case "line":
						if text == "" {
							return types.Int(0)
						}
						return types.Int(len(strings.Split(text, "\n")))

					default: // word
						return types.Int(len(strings.Fields(text)))
					}
				}),
			),
		),
	)

	if err != nil {
		return nil, fmt.Errorf("create CEL env: %w", err)
	}

	ast, issues := env.Compile(expression)
	if issues != nil && issues.Err() != nil {
		return nil, fmt.Errorf("compile CEL expression: %w", issues.Err())
	}

	program, err := env.Program(ast)
	if err != nil {
		return nil, fmt.Errorf("create CEL program: %w", err)
	}

	payload := map[string]any{
		"props": normalizeCELValue(props),
	}

	out, _, err := program.Eval(payload)
	if err != nil {
		return nil, fmt.Errorf("evaluate CEL expression: %w", err)
	}

	return out.Value(), nil
}

func (s SceneConfig) durationExpressionProps() map[string]any {
	props := make(map[string]any, len(s.Props))
	for key, value := range s.Props {
		props[key] = value
	}

	for group, items := range groupedRepeatProps(s.Props) {
		props[group] = items
	}

	return props
}

func groupedRepeatProps(props map[string]any) map[string][]any {
	groupedByName := map[string]map[int]map[string]any{}
	for key, value := range props {
		parts := strings.Split(key, "-")
		if len(parts) < 3 {
			continue
		}

		group := parts[len(parts)-2]
		index, err := strconv.Atoi(parts[len(parts)-1])
		if err != nil {
			continue
		}

		componentName := strings.Join(parts[:len(parts)-2], "-")

		grouped, found := groupedByName[group]
		if !found {
			grouped = map[int]map[string]any{}
			groupedByName[group] = grouped
		}

		item, found := grouped[index]
		if !found {
			item = map[string]any{}
			grouped[index] = item
		}

		item[componentName] = value
	}

	out := make(map[string][]any, len(groupedByName))
	for group, grouped := range groupedByName {
		maxIndex := -1
		for index := range grouped {
			if index > maxIndex {
				maxIndex = index
			}
		}

		items := make([]any, 0, len(grouped))
		for i := 0; i <= maxIndex; i++ {
			if item, ok := grouped[i]; ok {
				items = append(items, item)
			}
		}

		if len(items) > 0 {
			out[group] = items
		}
	}

	return out
}

func numericRefToFloat64(value ref.Val) (float64, bool) {
	return nativeNumericToFloat64(value.Value())
}

func nativeNumericToFloat64(value any) (float64, bool) {
	switch value := value.(type) {
	case int:
		return float64(value), true
	case int8:
		return float64(value), true
	case int16:
		return float64(value), true
	case int32:
		return float64(value), true
	case int64:
		return float64(value), true
	case uint:
		return float64(value), true
	case uint8:
		return float64(value), true
	case uint16:
		return float64(value), true
	case uint32:
		return float64(value), true
	case uint64:
		return float64(value), true
	case float32:
		return float64(value), true
	case float64:
		return value, true
	default:
		return 0, false
	}
}

func numericToInt32(value any) (int32, bool) {
	n, ok := nativeNumericToFloat64(value)
	if !ok {
		return 0, false
	}

	if math.IsNaN(n) || math.IsInf(n, 0) {
		return 0, false
	}

	return int32(math.Round(n)), true
}

func normalizeCELValue(value any) any {
	switch value := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(value))
		for key, item := range value {
			out[key] = normalizeCELValue(item)
		}
		return out
	case []any:
		out := make([]any, len(value))
		for i, item := range value {
			out[i] = normalizeCELValue(item)
		}
		return out
	case float64:
		if value == math.Trunc(value) {
			return int64(value)
		}
		return value
	default:
		return value
	}
}
