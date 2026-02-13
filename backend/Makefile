.PHONY: generate build

generate-baml:
	baml-cli generate

build: generate
	go build ./...

test: generate
	go test ./...
