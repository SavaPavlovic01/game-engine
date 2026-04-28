package game

type Action interface {
	GetTick() uint64
}

type ActionType uint32

const (
	MOVE ActionType = iota
)

type ActionHeader struct {
	PlayerId   string     `json:"playerId"`
	ActionType ActionType `json:"actionType"`
	Tick       uint64     `json:"tick"`
}

type MoveAction struct {
	ActionHeader
	DirX float32 `json:"dirx"`
	DirY float32 `json:"diry"`
}

func (mv MoveAction) GetTick() uint64 {
	return mv.Tick
}
