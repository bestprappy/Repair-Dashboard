# Repair Analytics Dashboard

A web dashboard for viewing and analysing repair inventory data. It can load data
from a Google Sheet automatically or let a user upload a CSV file manually.

This guide is written for complete beginners. You do not need to have written
code before. Follow the steps in order and copy each command exactly.

## What the dashboard does

The dashboard:

- requires a password before a user can enter;
- loads repair data from an optional shared Google Sheet;
- also supports uploading a `.csv` file directly in the browser;
- helps map CSV columns such as Company, Status, Group Equipment, Year-Month,
  Amount, and Equipment;
- shows company totals, repair status, monthly spending, equipment groups,
  service-level information, repeat repairs, vendor scorecards, and charts; and
- processes manually uploaded CSV files in the browser. Uploaded CSV files are
  not sent to the application server.

A sample data file named `repair.csv` is in the parent project folder.

## Before you begin

You need:

1. A Windows, macOS, or Linux computer.
2. Permission to install software on the computer.
3. An internet connection for the initial software and package installation.
4. At least 2 GB of free disk space (4 GB or more is recommended).
5. Visual Studio Code (VS Code).
6. Node.js version **20.9.0 or newer**. Installing the current **LTS** version is
   recommended.
7. `npm`, which is installed automatically with Node.js.
8. A copy of this project.

You do **not** need to install Python, Java, a database, or a separate web server.

## Important words used in this guide

| Word | Meaning |
| --- | --- |
| Folder / directory | A location on your computer that contains files. These words mean the same thing here. |
| Terminal | A text window where you type commands to tell the computer what to do. |
| Command | A line of text typed into the terminal, followed by Enter. |
| `cd` | “Change directory.” It moves the terminal into another folder. |
| Node.js | Software that runs this web project on your computer. |
| `npm` | The package manager included with Node.js. It downloads the code libraries the project needs. |
| Dependency / package | Reusable code required by this project. |
| Localhost | Your own computer. `http://localhost:3000` is the locally running dashboard. |
| Environment variable | A private configuration value, such as the dashboard password. |
| Development server | A local version of the website used while working on it. |

## Quick start checklist

If you already have VS Code and Node.js installed:

```powershell
cd "C:\path\to\Inventory\web"
Copy-Item .env.example .env.local
npm install
npm run dev
```

Then open <http://localhost:3000> in a web browser. The password is the value of
`AUTH_PASSWORD` in `.env.local`.

Complete beginners should use the detailed instructions below.

---

## Part 1: Install Visual Studio Code

VS Code is the program you will use to view project files and open a terminal.

### Windows

1. Go to <https://code.visualstudio.com/>.
2. Select **Download for Windows**.
3. Open the downloaded installer.
4. Accept the licence agreement and select **Next**.
5. Keep the default installation folder.
6. On the **Select Additional Tasks** screen, enable:
   - **Add "Open with Code" action to Windows Explorer file context menu**;
   - **Add "Open with Code" action to Windows Explorer directory context
     menu**; and
   - **Add to PATH**.
7. Select **Install**, then **Finish**.

### macOS

1. Go to <https://code.visualstudio.com/>.
2. Download the macOS version.
3. Open the downloaded `.zip` file if it does not open automatically.
4. Drag **Visual Studio Code** into the **Applications** folder.
5. Open Visual Studio Code from Applications.

### Recommended VS Code extensions

Extensions are optional. The project will run without them. To install one,
select the Extensions icon on the left side of VS Code (four small squares),
search for the name, and select **Install**.

- **ESLint** by Microsoft — displays JavaScript and TypeScript problems.
- **Tailwind CSS IntelliSense** by Tailwind Labs — helps with styling code.
- **Prettier - Code formatter** by Prettier — helps format files consistently.

Do not install extensions from unknown publishers.

---

## Part 2: Install Node.js and npm

Node.js runs the application. npm downloads its required packages.

### Windows (recommended installer method)

1. Go to <https://nodejs.org/>.
2. Download the version labelled **LTS**, not “Current.”
3. Open the downloaded `.msi` installer.
4. Select **Next** and accept the licence agreement.
5. Keep the default options, including **npm package manager** and **Add to
   PATH**.
6. Select **Install**.
7. Finish the installation.
8. Completely close and reopen VS Code. This lets VS Code detect Node.js.

### macOS

1. Go to <https://nodejs.org/>.
2. Download the **LTS** macOS installer.
3. Open the downloaded `.pkg` file.
4. Follow the installer instructions and keep the default options.
5. Completely close and reopen VS Code.

### Confirm that Node.js and npm work

In VS Code, open **Terminal > New Terminal** from the top menu. A panel opens at
the bottom. Type:

```powershell
node --version
```

Press Enter. The answer should begin with `v`, for example:

```text
v22.18.0
```

The number must be `v20.9.0` or newer. Next, type:

```powershell
npm --version
```

It should print a number, for example `10.9.3`.

The exact version numbers may be different. That is normal.

If the terminal says that `node` or `npm` is “not recognized” or “command not
found,” close every VS Code window and reopen VS Code. If it still fails,
reinstall the Node.js LTS version and ensure **Add to PATH** is enabled.

---

## Part 3: Open the project in VS Code

This repository contains the actual web application inside a folder named
`web`. The folder layout is:

```text
Inventory/
├── repair.csv          sample repair data
└── web/                the web application
    ├── package.json
    ├── .env.example
    ├── README.md
    ├── public/
    └── src/
```

### Option A: Open it using the VS Code menu

1. Start VS Code.
2. Select **File > Open Folder**.
3. Find and select the `Inventory` folder.
4. Select **Select Folder** or **Open**.
5. If VS Code asks whether you trust the authors, only select **Yes, I trust the
   authors** if you received the project from a trusted source.
6. Open **Terminal > New Terminal**.

The terminal normally opens in the `Inventory` folder. Move into the web
application folder by typing:

```powershell
cd web
```

Press Enter.

### Option B: Move to the project using `cd`

`cd` means “change directory.” The terminal can only run `npm` commands from the
folder containing `package.json`, which is the `web` folder.

Example Windows command:

```powershell
cd "C:\Users\YourName\Desktop\Inventory\web"
```

Example macOS command:

```bash
cd "/Users/YourName/Desktop/Inventory/web"
```

Replace the example path with the real location on your computer.

Quotation marks are important when a path contains spaces, such as `OneDrive -
Company Name`.

Useful folder commands:

```powershell
pwd
```

Shows the folder you are currently in.

```powershell
dir
```

Shows the files in the current folder on Windows PowerShell. On macOS or Linux,
use:

```bash
ls
```

```powershell
cd ..
```

Moves up one folder. For example, it moves from `Inventory\web` back to
`Inventory`.

Before continuing, `dir` or `ls` must show `package.json`. If it does not, you
are in the wrong folder.

---

## Part 4: Create the private settings file

The application requires a dashboard password. Its private local settings live
in a file named `.env.local`.

Make sure the terminal is in the `web` folder, then run the command for your
system.

### Windows PowerShell

```powershell
Copy-Item .env.example .env.local
```

### Windows Command Prompt

```bat
copy .env.example .env.local
```

### macOS or Linux

```bash
cp .env.example .env.local
```

In the VS Code Explorer on the left, select `.env.local`. It initially contains
values similar to:

```dotenv
NEXT_PUBLIC_SHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit?usp=sharing
AUTH_PASSWORD=replace-with-a-long-random-password
```

### Set the dashboard password

Replace only the text after `AUTH_PASSWORD=` with a strong password:

```dotenv
AUTH_PASSWORD=example-use-your-own-long-random-password
```

Use at least 20 random characters. Do not use your Windows password, company
password, or another personal password.

The password is case-sensitive. If the line says `AUTH_PASSWORD=MyPassword123`,
users must enter exactly `MyPassword123`.

### Optional: connect a Google Sheet

If the dashboard should load a Google Sheet automatically:

1. Open the Google Sheet.
2. Select **Share**.
3. Under general access, choose **Anyone with the link** and **Viewer**.
4. Copy the Google Sheet link.
5. Put the complete link after `NEXT_PUBLIC_SHEET_URL=`.

Example:

```dotenv
NEXT_PUBLIC_SHEET_URL=https://docs.google.com/spreadsheets/d/1ExampleSheetId/edit?usp=sharing
```

Anyone who has the sheet link will be able to read that sheet, so only use this
setting if its data is appropriate to share in that way.

If you do not want to use a Google Sheet, delete the entire
`NEXT_PUBLIC_SHEET_URL=...` line or leave the value empty:

```dotenv
NEXT_PUBLIC_SHEET_URL=
```

The dashboard will then offer the manual CSV upload flow.

Save the file with **File > Save** or `Ctrl+S` on Windows (`Cmd+S` on macOS).

> **Security warning:** Never send `.env.local` to another person, upload it to
> GitHub, or paste it into a chat or issue. The project is configured to ignore
> `.env.local` in Git.

---

## Part 5: Install the project packages

This project lists its dependencies in `package.json`. Install the exact
dependency set by running:

```powershell
npm install
```

The first installation can take several minutes. npm will create:

- a `node_modules` folder containing downloaded packages; and
- possibly an updated `package-lock.json` dependency record.

Warnings beginning with `npm WARN` do not always mean the installation failed.
Look at the final lines. If the command returns to a prompt without an
`npm ERR!` message, installation normally succeeded.

You usually run `npm install` only:

- the first time you receive the project;
- after someone changes `package.json` or `package-lock.json`; or
- after deleting the `node_modules` folder.

Do not manually edit files inside `node_modules`.

---

## Part 6: Start the dashboard

Run:

```powershell
npm run dev
```

`npm run dev` means: ask npm to run the script named `dev` in `package.json`.
That script starts the local Next.js development server.

Wait until the terminal displays a message similar to:

```text
Local: http://localhost:3000
Ready
```

Open <http://localhost:3000> in Chrome, Edge, Firefox, or Safari. Enter the
password from `.env.local`.

Keep the terminal open while using the dashboard. Closing the terminal stops
the local website.

### Stop the dashboard

Click inside the terminal that is running the server and press:

```text
Ctrl+C
```

If PowerShell asks `Terminate batch job (Y/N)?`, type `Y` and press Enter.

### Start it again later

1. Open the project in VS Code.
2. Open **Terminal > New Terminal**.
3. Make sure the terminal is in the `web` folder.
4. Run:

```powershell
npm run dev
```

You do not need to run `npm install` every time.

### If you change `.env.local`

Stop the development server with `Ctrl+C`, then start it again with:

```powershell
npm run dev
```

This ensures the new settings are loaded.

---

## Part 7: Use the dashboard

### Automatic Google Sheet flow

If `NEXT_PUBLIC_SHEET_URL` is configured correctly, the application loads the
sheet data when it starts.

### Manual CSV flow

If no Google Sheet URL is configured:

1. Sign in.
2. Drag a `.csv` file onto the upload area, or use the file picker.
3. Match the CSV headings to the requested dashboard fields.
4. Confirm the mapping.
5. Use the sidebar, filters, charts, and tables to explore the results.

To try the included sample data, select `repair.csv` from the parent `Inventory`
folder.

For the best result, the CSV should contain columns representing:

- Company;
- Status;
- Group Equipment;
- Year-Month;
- Amount; and
- Equipment (optional).

The mapper tries to guess matching columns, but users should check the choices
before continuing.

---

## Available npm commands

Run these commands only from the `web` folder.

| Command | Purpose |
| --- | --- |
| `npm install` | Downloads all project dependencies. |
| `npm run dev` | Starts the development server at `http://localhost:3000`. |
| `npm run lint` | Checks the source code for common quality problems. |
| `npm run build` | Creates an optimised production build and checks that it compiles. |
| `npm run start` | Runs the production build. Run `npm run build` first. |

### Check the code

Before sharing code changes, run:

```powershell
npm run lint
npm run build
```

Fix any errors shown in red. A build can take several minutes.

### Test a production build locally

Stop the development server first, then run:

```powershell
npm run build
npm run start
```

Open <http://localhost:3000>. Stop it with `Ctrl+C`.

Development work normally uses `npm run dev`; `npm run start` is not a
replacement for the build step.

---

## Troubleshooting

### “npm is not recognized” or “npm: command not found”

Node.js is not installed or VS Code has not detected it.

1. Install the Node.js LTS version.
2. Close all VS Code windows.
3. Reopen VS Code.
4. Run `node --version` and `npm --version` again.

### `npm ERR! enoent Could not read package.json`

The terminal is in the wrong folder. Move into `web`:

```powershell
cd web
```

Then use `dir` or `ls` and confirm that `package.json` is listed.

### PowerShell says scripts are disabled

On some Windows computers, PowerShell may block `npm.ps1`. You can run the
Windows command version without changing the computer's security policy:

```powershell
npm.cmd install
npm.cmd run dev
```

Alternatively, open a Command Prompt terminal in VS Code:

1. Select the small arrow next to the **+** button in the Terminal panel.
2. Select **Command Prompt**.
3. Run `npm install` and `npm run dev` there.

Company-managed devices may have security policies that only an IT
administrator can change.

### “AUTH_PASSWORD is not configured” or a 503 authentication message

The `.env.local` file is missing, has the wrong name, or does not contain a
valid `AUTH_PASSWORD`.

1. Confirm the file is named exactly `.env.local`, not `.env.local.txt`.
2. Confirm it is inside the `web` folder.
3. Confirm it contains `AUTH_PASSWORD=your-password`.
4. Do not add spaces before the variable name.
5. Stop the server with `Ctrl+C` and run `npm run dev` again.

### The password is rejected

- Passwords are case-sensitive.
- Use the exact value after `AUTH_PASSWORD=` in `.env.local`.
- Do not include `AUTH_PASSWORD=` when typing into the login page.
- Restart the server after changing `.env.local`.
- An existing login session lasts up to eight hours.

### Port 3000 is already in use

Another application may already be using port 3000. Next.js may offer port 3001
automatically. Open the exact `Local:` address printed in the terminal.

To request a specific different port:

```powershell
npm run dev -- -p 3001
```

Then open <http://localhost:3001>.

### The browser says it cannot connect

1. Confirm `npm run dev` is still running.
2. Wait for the terminal to say `Ready`.
3. Open the exact local address shown in the terminal.
4. Do not close the terminal while using the dashboard.
5. Try `http://localhost:3000`, not `https://localhost:3000`.

### The Google Sheet does not load

1. Confirm the link is complete and on the
   `NEXT_PUBLIC_SHEET_URL=` line.
2. Confirm the sheet is shared as **Anyone with the link can view**.
3. Confirm the sheet contains usable column headings and data.
4. Restart the development server after editing `.env.local`.
5. Test the manual CSV flow to determine whether the problem is specific to the
   sheet.

### `npm install` fails

1. Confirm the internet connection works.
2. Run `node --version` and ensure it is `v20.9.0` or newer.
3. Confirm the terminal is in the `web` folder.
4. If using a company network, a proxy or firewall may block npm. Ask the IT
   team whether access to the npm registry is permitted.
5. Read the first `npm ERR!` message; later messages are often consequences of
   the first error.

Do not delete project files or use commands copied from an unknown website to
fix an npm error.

### Changes do not appear in the browser

1. Save the edited file.
2. Wait for the terminal to finish compiling.
3. Refresh the browser.
4. If the changed value is in `.env.local`, restart the server.
5. Check the VS Code terminal for a red error message.

---

## Data and security notes

- `.env.local` contains the private dashboard password and must not be committed.
- `AUTH_PASSWORD` is server-only. Never rename it to
  `NEXT_PUBLIC_AUTH_PASSWORD`; variables beginning with `NEXT_PUBLIC_` can be
  included in browser code.
- The Google Sheet URL is visible to the browser because it uses the
  `NEXT_PUBLIC_` prefix.
- A manually uploaded CSV is parsed in the user's browser and is not uploaded to
  the application server by this feature.
- Login creates a signed, HTTP-only cookie that lasts eight hours.
- The production application requires a server. It cannot be securely hosted as
  a static GitHub Pages site.
- For production, use a server-capable provider such as Vercel, Netlify, or a
  managed Node.js server and configure environment variables in that provider.
- Never place the real password in source code, a GitHub Actions file, a
  screenshot, or this README.

## Project structure

```text
web/
├── public/                         static images and icons
├── src/
│   ├── app/                        pages, layouts, login, and API routes
│   ├── components/                 reusable interface components
│   ├── features/
│   │   ├── repair-dashboard/       dashboard logic, charts, and views
│   │   └── sheet-viewer/           Google Sheet display logic
│   └── lib/                        authentication and shared utilities
├── .env.example                   safe configuration template
├── .env.local                     private local settings (you create this)
├── package.json                   npm commands and dependency list
├── package-lock.json              exact dependency versions
├── next.config.ts                 Next.js configuration
└── README.md                      this guide
```

## Technology overview

No knowledge of these tools is required just to start the application:

- **Next.js 16** — web application framework;
- **React 19** — user interface library;
- **TypeScript** — JavaScript with additional error checking;
- **Tailwind CSS 4** and **shadcn/ui** — styling and interface components;
- **Jotai** — dashboard interface state;
- **TanStack Query** — data-query provider;
- **Recharts** — charts; and
- **PapaParse** — browser-based CSV parsing.

## Beginner command reference

| What you want to do | Command |
| --- | --- |
| Show the current folder | `pwd` |
| Show files on Windows | `dir` |
| Show files on macOS/Linux | `ls` |
| Enter the `web` folder | `cd web` |
| Move up one folder | `cd ..` |
| Move to a path containing spaces | `cd "C:\My Projects\Inventory\web"` |
| Check Node.js | `node --version` |
| Check npm | `npm --version` |
| Install packages | `npm install` |
| Start the dashboard | `npm run dev` |
| Stop a running command | `Ctrl+C` |

## First-time setup summary

Starting from the `Inventory` folder:

```powershell
cd web
Copy-Item .env.example .env.local
npm install
npm run dev
```

Before `npm run dev`, open `.env.local`, replace the example password, and
optionally set the Google Sheet link. Then visit <http://localhost:3000>.
