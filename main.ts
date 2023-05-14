import { Client } from "https://deno.land/x/workflowy@2.0.0/src/client.ts";
import {
  Document,
  List,
} from "https://deno.land/x/workflowy@2.0.0/src/document.ts";
import * as sunbeam from "https://deno.land/x/sunbeam@v0.9.26/index.d.ts";
import { join } from "https://deno.land/std/path/mod.ts";
import { convert } from "npm:html-to-text";

const dataKey = "workflowy";

const dirname = new URL(".", Deno.mainModule).pathname;
const entrypoint = join(dirname, "sunbeam-extension");

const login = Deno.env.get("WORKFLOWY_LOGIN");
const password = Deno.env.get("WORKFLOWY_PASSWORD");
if (!login || !password) {
  console.error(
    "Please set WORKFLOWY_LOGIN and WORKFLOWY_PASSWORD environment variables"
  );
  Deno.exit(1);
}

const getDocument = (client: Client) => {
  const fetchDocument = async () => {
    const treeData = await client.getTreeData();
    const initializationData = await client.getInitializationData();

    localStorage.setItem(
      dataKey,
      JSON.stringify({
        treeData,
        initializationData,
        expirationTime: Date.now() + 1000 * 60 * 5, // 5 minutes
      })
    );

    return new Document(client, treeData, initializationData);
  };

  const wfData = localStorage.getItem(dataKey);
  if (!wfData) {
    return fetchDocument();
  }

  const data = JSON.parse(wfData);
  if (data.expirationTime < Date.now()) {
    return fetchDocument();
  }

  return new Document(client, data.treeData, data.initializationData);
};

function listItems(rootList: List) {
  const items = rootList.items.map((node) => {
    const actions = [] as sunbeam.Action[];
    if (node.items.length > 0) {
      actions.push({
        type: "push",
        page: {
          command: [entrypoint, "list", node.id],
        },
      });
    }
    actions.push(
      {
        type: "open",
        title: "Open in Browser",
        target: `https://workflowy.com/#/${node.id}`,
      },
      {
        type: "run",
        reloadOnSuccess: true,
        command: [entrypoint, "remove", node.id],
      }
    );

    return {
      title: convert(node.name),
      accessories: node.items.length > 0 ? [">"] : undefined,
      actions,
    } as sunbeam.Listitem;
  });

  return {
    type: "list",
    title: "Workflowy",
    items,
  } as sunbeam.List;
}

const client = new Client(login, password);
const document = await getDocument(client);

const command = Deno.args[0];

switch (command) {
  case undefined:
  case "list": {
    const parentID = Deno.args[1];
    const parent = parentID ? document.getList(parentID) : document.root;
    const page = listItems(parent);
    console.log(JSON.stringify(page));
    break;
  }
  case "remove": {
    const nodeID = Deno.args[0];
    const node = document.getList(nodeID);
    node.delete();
    localStorage.removeItem(dataKey);
    break;
  }
  default: {
    console.error(`Unknown command: ${command}`);
    Deno.exit(1);
  }
}
