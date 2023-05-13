import { Client } from "https://deno.land/x/workflowy@2.0.0/src/client.ts";
import { Document } from "https://deno.land/x/workflowy@2.0.0/src/document.ts";
import * as sunbeam from "https://deno.land/x/sunbeam@v0.9.26/index.d.ts";
import { join } from "https://deno.land/std/path/mod.ts";
import { convert } from "npm:html-to-text";

const dataKey = "workflowy";

const dirname = new URL(".", import.meta.url).pathname;
const entrypoint = join(dirname, "sunbeam-extension");

const login = Deno.env.get("WORKFLOWY_LOGIN");
const password = Deno.env.get("WORKFLOWY_PASSWORD");
if (!login || !password) {
  console.error(
    "Please set WORKFLOWY_LOGIN and WORKFLOWY_PASSWORD environment variables"
  );
  Deno.exit(1);
}

const root = Deno.args.length > 0 ? Deno.args[0] : undefined;

const getDocument = async (client: Client) => {
  const wfData = localStorage.getItem(dataKey);
  if (!wfData) {
    const treeData = await client.getTreeData();
    const initializationData = await client.getInitializationData();

    localStorage.setItem(
      dataKey,
      JSON.stringify({
        treeData,
        initializationData,
        expirationTime: Date.now() + 1000 * 60 * 60 * 5,
      })
    );

    return new Document(client, treeData, initializationData);
  }

  const data = JSON.parse(wfData);
  return new Document(client, data.treeData, data.initializationData);
};

const client = new Client(login, password);
const document = await getDocument(client);

const rootList = root ? document.getList(root) : document.root;
const items = rootList.items.map((list) => {
  const actions = [] as sunbeam.Action[];
  if (list.items.length > 0) {
    actions.push({
      type: "push",
      page: {
        command: [entrypoint, list.id],
      },
    });
  }
  actions.push({
    type: "open",
    title: "Open in Browser",
    target: `https://workflowy.com/#/${list.id}`,
  });

  return {
    title: convert(list.name),
    actions,
  } as sunbeam.Listitem;
});

const list = {
  type: "list",
  title: "Workflowy",
  items,
} as sunbeam.List;

console.log(JSON.stringify(list));
