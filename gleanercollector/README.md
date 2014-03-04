## Protocol to communicate with gleaner-collector

gleaner-collector is the server-side part of gleaner that receives games traces and stores them in the gleaner database.

### Start tracking

To send traces to the gleaner-collector, the client must first ask permission to the server sending the following request:

`GET start/:gamekey`

 - `gamekey` is a unique identifier, known by gleaner, representing the game to track.

gleaner checks request credentials and if they're valid returns an http code `200` with an authorization object:

`{ sessionKey: 'some_auth_token' }`

### Sending traces

Clients sends traces to:

`POST track`

The request must set its `Authorization` header with the value returned in `sessionToken`.

The message body must contain a list of json objects. Each of this object represents a trace, and must follow the following structure:

```javascript
{
	type: 'trace_type',
	timeStamp: some_timestamp, // A timestamp with the moment this trace was generated
	...
	Other values
}
```
`204` is returned if the list of traces is added, `400` if the format is incorrect or `401` if user hasn't got permission.

gleaner-collector only checks for fields `type` and `timeStamp`. Traces can contain as many fields as desired. However, many of the built-in tools in gleaner use two types of traces, `input`, representing direct interactions of players with input devices (as mouses, keyboards, controllers...) and `logic`, representing logic events in the game. They follow the next structure:

```javascript
{
	type: 'input',
	timeStamp: some_timestamp,
	device: 'some_device', // Predefined values: 'mouse', 'keyboard', 'screen'
	action: 'some_action', // Predefined values: 'move', 'press', 'release', 'click', 'drag'
	target: 'target_id' // An identifier of the in-game element that processed the input event, if any
	data: { key1: value, key2: value2, ...} // To pass additional arguments. A 'mouse' input would contain a x and y coordinates and the button
}
```

```javascript
{
	type: 'logic',
	timeStamp: some_timestamp,
	event: 'some_event', // Predefined values: 'game_start', 'game_end', 'game_quit', 'phase_start', 'phase_end', 'var_update'
	target: 'some_id', // See examples below to understand this fields
	data: { key1: value, key2: value2, ...}
}
```

#### Examples:

```javascript
{
	type: 'input',
	timeStamp: new Date(),
	device: 'mouse',
	action: 'press',
	data: { button: 0, x: 250, y: 600 }, // Pressed button 0 in coordinates (250, 600)
	target: null
}
```

```javascript
{
	type: 'input',
	timeStamp: new Date(),
	device: 'keyboard',
	action: 'click' // Typed
	data: { keycode: 'a' }, // 'a' was the character typed
	target: 'spaceship' // The game entity with id 'spaceship' processed this input
}
```

```javascript
{
	type: 'logic',
	timeStamp: new Date(),
	event: 'game_start' // The first trace to be sent
}
```

```javascript
{
	type: 'logic',
	timeStamp: new Date(),
	event: 'game_quit' // Player quits the game before finishing it
}
```

```javascript
{
	type: 'logic',
	timeStamp: new Date(),
	event: 'game_end' // Player finishes the game
}
```

```javascript
{
	type: 'logic',
	timeStamp: new Date(),
	event: 'phase_start',
	target: 'phase 1' // Player enters 'phase 1' in the game
}
```

```javascript
{
	type: 'logic',
	timeStamp: new Date(),
	event: 'phase_end',
	target: 'final boss' // Player finishes the phase 'final boss'
}
```

```javascript
{
	type: 'logic',
	timeStamp: new Date(),
	event: 'var_update',
	target: 'score',
	data: { value: 2500 } // Player 'score' value is updated to 2500
}
```
