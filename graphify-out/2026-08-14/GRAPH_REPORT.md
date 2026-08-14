# Graph Report - .  (2026-06-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 96 nodes · 116 edges · 11 communities (8 shown, 3 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c0da49d3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_GraphView graf-motor|GraphView graf-motor]]
- [[_COMMUNITY_App-skall og fanenavigasjon|App-skall og fanenavigasjon]]
- [[_COMMUNITY_Tegne- og eksportverktøy|Tegne- og eksportverktøy]]
- [[_COMMUNITY_Fysikk-fanen og under-faner|Fysikk-fanen og under-faner]]
- [[_COMMUNITY_Matteuttrykk-parser og tester|Matteuttrykk-parser og tester]]
- [[_COMMUNITY_App-pakkemanifest|App-pakkemanifest]]
- [[_COMMUNITY_MCP-server-pakke|MCP-server-pakke]]
- [[_COMMUNITY_Lagring og persistens|Lagring og persistens]]
- [[_COMMUNITY_MCP graphify-server|MCP graphify-server]]
- [[_COMMUNITY_MCP-konfigurasjon|MCP-konfigurasjon]]

## God Nodes (most connected - your core abstractions)
1. `GraphView` - 19 edges
2. `index.html (MatteFysikkLab app page)` - 10 edges
3. `PhysicsTab` - 9 edges
4. `Fysikk tab (physics with subtabs)` - 7 edges
5. `CalculusTab` - 4 edges
6. `LinAlgTab` - 4 edges
7. `TrigTab` - 4 edges
8. `fitCanvas()` - 3 edges
9. `graphify` - 2 edges
10. `ForcesTab` - 2 edges

## Surprising Connections (you probably didn't know these)
- `index.html (MatteFysikkLab app page)` --references--> `PhysicsTab`  [INFERRED]
  index.html → js/physics.js
- `Kalkulus tab (plot/analyze functions)` --implements--> `CalculusTab`  [INFERRED]
  index.html → js/calculus.js
- `index.html (MatteFysikkLab app page)` --references--> `CalculusTab`  [INFERRED]
  index.html → js/calculus.js
- `index.html (MatteFysikkLab app page)` --references--> `LinAlgTab`  [INFERRED]
  index.html → js/linalg.js
- `Lineær algebra tab (vectors, matrices, transformations)` --implements--> `LinAlgTab`  [INFERRED]
  index.html → js/linalg.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **MatteFysikkLab main UI tabs** — index_calculus_tab, index_trig_tab, index_linalg_tab, index_physics_tab [INFERRED 0.85]
- **Fysikk subtabs sequence** — index_physics_metode, index_physics_kinematikk, index_physics_dynamikk, index_physics_energi, index_physics_termo [INFERRED 0.85]

## Communities (11 total, 3 thin omitted)

### Community 1 - "App-skall og fanenavigasjon"
Cohesion: 0.22
Nodes (10): Kalkulus tab (plot/analyze functions), index.html (MatteFysikkLab app page), Lineær algebra tab (vectors, matrices, transformations), Trigonometri tab (unit circle, waves, calculator), CalculusTab, LinAlgTab, closeMenu(), switchTab() (+2 more)

### Community 2 - "Tegne- og eksportverktøy"
Cohesion: 0.24
Nodes (3): fitCanvas(), formatNum(), niceStep()

### Community 3 - "Fysikk-fanen og under-faner"
Cohesion: 0.11
Nodes (12): Fysikk subtab: Krefter og dynamikk, Fysikk subtab: Energi og arbeid, Fysikk subtab: Rettlinjet bevegelse (kinematikk), Fysikk subtab: Språk og metoder, Fysikk tab (physics with subtabs), Fysikk subtab: Termofysikk, ForcesTab, PhysEnergy (+4 more)

### Community 4 - "Matteuttrykk-parser og tester"
Cohesion: 0.25
Nodes (4): MathParser, assert, MathParser, test

### Community 5 - "App-pakkemanifest"
Cohesion: 0.25
Nodes (7): description, license, name, private, scripts, test, version

### Community 6 - "MCP-server-pakke"
Cohesion: 0.29
Nodes (6): dependencies, @modelcontextprotocol/sdk, main, name, type, version

### Community 8 - "MCP graphify-server"
Cohesion: 0.40
Nodes (4): __dirname, server, transport, VAULT

## Knowledge Gaps
- **27 isolated node(s):** `node`, `name`, `version`, `type`, `main` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PhysicsTab` connect `Fysikk-fanen og under-faner` to `App-skall og fanenavigasjon`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `GraphView` connect `GraphView graf-motor` to `Tegne- og eksportverktøy`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `index.html (MatteFysikkLab app page)` connect `App-skall og fanenavigasjon` to `Fysikk-fanen og under-faner`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `index.html (MatteFysikkLab app page)` (e.g. with `CalculusTab` and `LinAlgTab`) actually correct?**
  _`index.html (MatteFysikkLab app page)` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `PhysicsTab` (e.g. with `index.html (MatteFysikkLab app page)` and `Fysikk tab (physics with subtabs)`) actually correct?**
  _`PhysicsTab` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `CalculusTab` (e.g. with `Kalkulus tab (plot/analyze functions)` and `index.html (MatteFysikkLab app page)`) actually correct?**
  _`CalculusTab` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `node`, `name`, `version` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._