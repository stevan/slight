import { spawn } from "child_process";

const claude = spawn("claude", ["-p", "What is 2 + 2?"]);

let output = "";
claude.stdout.on("data", (data) => output += data);
claude.on("close", () => console.log(output.trim()));
