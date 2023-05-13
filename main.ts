import { Client } from "https://deno.land/x/workflowy@2.0.0/src/client.ts";
import { Document } from "https://deno.land/x/workflowy@2.0.0/src/document.ts";
import * as sunbeam from "https://deno.land/x/sunbeam/index.d.ts";
import { convert } from "npm:html-to-text";

const login = Deno.env.get("WORKFLOWY_LOGIN");
const password = Deno.env.get("WORKFLOWY_PASSWORD");
if (!login || !password) {
  console.error(
    "Please set WORKFLOWY_LOGIN and WORKFLOWY_PASSWORD environment variables"
  );
  Deno.exit(1);
}

const client = new Client(login, password);
const treeData = await client.getTreeData();
const initializationData = await client.getInitializationData();
const document = new Document(client, treeData, initializationData);

const items = document.root.items.map(
  (item) =>
    ({
      title: convert(item.name),
      actions: [
        {
          type: "open",
          title: "Open in Browser",
          target: `https://workflowy.com/#/${item.id}`,
        },
      ],
    } as sunbeam.Listitem)
);

const list = {
  type: "list",
  title: "Workflowy",
  items,
} as sunbeam.List;

console.log(JSON.stringify(list));
