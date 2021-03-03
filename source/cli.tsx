#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import meow from "meow";
import App from "./App";

const cli = meow(
  `
	Usage
	  $ p2p-expressjs

	Options
		--upstreamAddress string
		--upstreamPort string

	Example
		--upstreamAddress=127.0.0.1
		--upstreamPort=3489

`,
  {
    flags: {
      upstreamAddress: {
        type: "string",
      },
      upstreamPort: {
        type: "number",
      },
    },
  }
);

render(<App {...cli.flags} />);
