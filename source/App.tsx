import "source-map-support/register";
import dotenv from 'dotenv'
import React, { useEffect, useState } from "react";
import { Text } from "ink";
import express from "express";
import net from "net";
import { Node, registerNode, getNodes } from "./Node";
import { hashObject } from "./hashObject";

dotenv.config()
const { PORT } = process.env

const app = express();
app.use(express.json());

let nodes: { [x: string]: Node } = {};
let nodesListOfHashes: string[] = [];
let HashOfAllNodes: string = hashObject(nodesListOfHashes);
const addNode = (newNode: Node) => {
  const key = hashObject(newNode);
  const newNodes = { [key]: newNode };
  updateNodes(newNodes);
};
const updateNodes = (newNodes?: { [x: string]: Node }) => {
  nodes = { ...nodes, ...newNodes };
  nodesListOfHashes = Object.keys(nodes);
  HashOfAllNodes = hashObject(nodesListOfHashes.sort());
  console.log(`new hash ${HashOfAllNodes}`);
};

app.post("/addNode", (req, res) => {
  const { address, port } = req.body;
  addNode({ address, port, online: true });
  res.json({ success: true, info: "welcome to the network" });
});

app.get("/getNodes", (req, res) => {
  const { hash } = req.query;

  if (hash === HashOfAllNodes) {
    res.json({ success: false, info: "we have the same list of hashes" });
  } else {
    res.json({
      success: true,
      info: "here have my nodes",
      data: JSON.stringify(nodes),
    });
  }
});

setInterval(async () => {
  await Promise.all(
    nodesListOfHashes.map(async (nodeHash) => {
      const peerNode: Node | undefined = nodes[nodeHash];
      if (peerNode !== undefined) {
        const { success, data: listOfNodes } = await getNodes(
          peerNode,
          HashOfAllNodes
        );
        if (success && listOfNodes) {
          updateNodes(listOfNodes);
        } else {
          // if (nodes[nodeHash] !== undefined) {
          //   nodes[nodeHash].online = false;
          // }
        }
      }
    })
  );
}, 5000);

interface AppProps {
  upstreamAddress?: string;
  upstreamPort?: number;
}

const App = ({ upstreamAddress, upstreamPort }: AppProps) => {
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    if (upstreamAddress && upstreamPort) {
      console.log("connecting to upstream");
      addNode({ address: upstreamAddress, port: upstreamPort, online: true });
    } else {
      console.log("no upstream!!");
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Text>{timestamp}</Text>
      <Text color="green">{JSON.stringify(nodes, null, 2)}</Text>
    </>
  );
};

export default App;

const server = app.listen(PORT && parseInt(PORT, 10) || 0, "localhost", () => {
  const { address, port } = server.address() as net.AddressInfo;

  console.log(`listening on http://${address}:${port}/`);

  if (nodesListOfHashes.length !== 0) {
    nodesListOfHashes.forEach((nodeHash) => {
      const thisNode: Node = { address, port, online: true };
      const peerNode: Node | undefined = nodes[nodeHash];
      if (peerNode !== undefined) {
        registerNode({ thisNode, peerNode });
      }
    });
  }
});
