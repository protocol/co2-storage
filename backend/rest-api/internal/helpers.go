package internal

import (
	"database/sql"
	"encoding/json"
	"strconv"
	"strings"
)

func SqlNullableString(s string) sql.NullString {
	if len(s) == 0 {
		return sql.NullString{}
	}
	return sql.NullString{
		String: strings.TrimSpace(s),
		Valid:  true,
	}
}

func SqlNullableIntFromString(s string) sql.NullInt32 {
	if len(s) == 0 {
		return sql.NullInt32{}
	}
	i, err := strconv.Atoi(s)
	if err != nil {
		return sql.NullInt32{}
	}
	return sql.NullInt32{
		Int32: int32(i),
		Valid: true,
	}
}

// NullString is an alias for sql.NullString data type
type NullString struct {
	sql.NullString
}

// MarshalJSON for NullString
func (ns *NullString) MarshalJSON() ([]byte, error) {
	if !ns.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(ns.String)
}

// NullInt32 is an alias for sql.NullInt32 data type
type NullInt32 struct {
	sql.NullInt32
}

// MarshalJSON for NullInt32
func (ns *NullInt32) MarshalJSON() ([]byte, error) {
	if !ns.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(ns.Int32)
}

// NullFloat64 is an alias for sql.NullFloat64 data type
type NullFloat64 struct {
	sql.NullFloat64
}

// MarshalJSON for NullFloat64
func (ns *NullFloat64) MarshalJSON() ([]byte, error) {
	if !ns.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(ns.Float64)
}

// GeoJSON is custom data type
type GeoJSON struct {
	Type        string    `json:"type,omitempty"`
	Coordinates []float32 `json:"coordinates,omitempty"`
}

// NullGeoJSON is custom data type
type NullGeoJSON struct {
	GeoJson GeoJSON
	Valid   bool
}

// Scan implements the Scanner interface for NullGeoJSON
func (ngj *NullGeoJSON) Scan(value *NullGeoJSON) error {
	// if Point is empty string then make Valid false
	if value.GeoJson.Type == "" {
		*ngj = NullGeoJSON{ngj.GeoJson, false}
	} else {
		*ngj = NullGeoJSON{ngj.GeoJson, true}
	}

	return nil
}

// MarshalJSON for NullGeoJSON
func (ngs *NullGeoJSON) MarshalJSON() ([]byte, error) {
	ngs.Scan(ngs)
	if !ngs.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(ngs.GeoJson)
}
