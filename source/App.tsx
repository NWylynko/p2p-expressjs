import "source-map-support/register";
import "dotenv/config";
import React, { useEffect, useState } from "react";
import { Text, Box } from "ink";
import express from "express";
import net from "net";
import { Node, registerNode, getNodes } from "./Node";
import { hashObject } from "./hashObject";

const { PORT } = process.env;

const app = express();
app.use(express.json());

let nodes: { [x: string]: Node } = {};
let nodesListOfHashes: string[] = [];
let HashOfAllNodes: string = hashObject(nodesListOfHashes);
let HashOfMySelf: string;
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
      if (nodeHash === HashOfMySelf) {
        return;
      }
      const peerNode: Node | undefined = nodes[nodeHash];
      if (peerNode === undefined) {
        return;
      }
      console.log(`getting nodes of`, peerNode);
      try {
        const { success, data: listOfNodes } = await getNodes(
          peerNode,
          HashOfAllNodes
        );
        if (success && listOfNodes) {
          console.log(`got nodes of`, peerNode);
          updateNodes(listOfNodes);
        } else {
          console.log(`didnt get nodes of`, peerNode);
        }
      } catch (error) {
        // nodes[nodeHash].online = false;
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
      <Text>my hash {HashOfMySelf}</Text>
      {nodesListOfHashes.map((nodeHash) => {
        const node = nodes[nodeHash];
        if (!node) {
          return <></>;
        }
        return (
          <Box key={nodeHash} padding={1} flexDirection="column">
            <Text>Hash: {nodeHash}</Text>
            <Text>Address: {node.address}</Text>
            <Text>Port: {node.port}</Text>
            <Text color={node.online ? "green" : "red"}>
              Online: {node.online ? "True" : "False"}
            </Text>
          </Box>
        );
      })}
    </>
  );
};

export default App;

const server = app.listen(
  (PORT && parseInt(PORT, 10)) || 0,
  "localhost",
  () => {
    const { address, port } = server.address() as net.AddressInfo;
    const thisNode: Node = { address, port, online: true };
    HashOfMySelf = hashObject(thisNode);

    console.log(`listening on http://${address}:${port}/`);

    if (nodesListOfHashes.length !== 0) {
      nodesListOfHashes.forEach((nodeHash) => {
        const peerNode: Node | undefined = nodes[nodeHash];
        if (peerNode !== undefined) {
          registerNode({ thisNode, peerNode });
        }
      });
    }
  }
);
