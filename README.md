# slidesk-local-runner
Present SliDesk with speaker notes from any static files webserver

## The need

With [SliDesk](https://github.com/slidesk/slidesk), slides are usually served from a [Bun](https://bun.sh/) server.
This leverages many possibilities, including having custom server plugins but somewhat conflicts with my current usage of having my personal slides desk on an Apache webserver serving only static files and no need for any server plugins.

SliDesk offer the possibility to save the slides in plain html/css/js that can be served from an Apache server but it comes with a limitation.
Speaker notes are no longer available because they need the Bun server to synchronize with the slides using websockets.

The code in this repo allows slides+speaker notes served from a static file server with local slides<->speaker view synchronization.

## Usage

Export your slides with SliDesk

```sh
slidesk -st
```

Replace the `slidesk.js` and `slidesk-notes.js` in the exported slides with the ones from this repo.

Adapt the `slidesk.js` header by copying the data from the exported one. For example, if you are using plugins that need some code in `onSlideChange`.

## Demo

You can test this runner with my [slidesk-plotly plugin](https://github.com/Oaz/slidesk-plotly) demo slides.

- Open the [speaker notes](https://slides.azeau.com/demo/slidesk-plotly/notes.html)
- then
  - open the slides using the button available in the speaker view.
  - or just open the [slides](https://slides.azeau.com/demo/slidesk-plotly/) separately as they will also be connected.

## Technical details

The code uses
- the browser [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) to store the data shared between the slides view and the speaker view
- a [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) for communication between the views.

The code was 100% AI generated. Use at your own risk.
