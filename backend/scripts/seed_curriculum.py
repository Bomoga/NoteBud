"""
General seed script — pre-med three-semester curriculum.

Creates a user, fills their backpack with 11 notebooks (3 semesters),
34 notepages, 14 connections, and Unsplash banner images.

Usage (from /backend directory):
    python -m scripts.seed_curriculum                         # defaults
    python -m scripts.seed_curriculum --username Alice --password secret1
    python -m scripts.seed_curriculum --base-url http://192.168.1.10:8000
    python -m scripts.seed_curriculum --skip-banners

Options:
    --username     Account username  (default: RoaryPanther)
    --password     Account password  (default: panther1234)
    --base-url     API root URL      (default: http://localhost:8000,
                                      overridden by BASE_URL env var)
    --skip-banners Skip banner image uploads (useful offline)
"""

import argparse
import io
import os
import requests
import markdown as _md

_MD = _md.Markdown(extensions=["tables", "fenced_code"])


def md_to_html(text: str) -> str:
    _MD.reset()
    return _MD.convert(text)


# ---------------------------------------------------------------------------
# Banner photo IDs (Unsplash CDN — public, no auth required)
# ---------------------------------------------------------------------------

_BANNER_CDN = "https://images.unsplash.com/photo-{id}?w=1400&h=500&fit=crop&q=85"

BANNERS: dict[str, str] = {
    "BSC2010": "1576086213369-97a306d36557",  # cells under microscope
    "CHM2045": "1532187863486-abf9dbad1b69",  # colorful lab glassware
    "MAC2311": "1596495577886-d920f1fb7238",  # math equations on blackboard
    "BSC2011": "1546026423-cc4642628d2b",     # coral reef / ocean biodiversity
    "CHM2046": "1582719471384-894fbb16e074",  # chemistry lab bench
    "MAC2312": "1635070041078-e363dbe005cb",  # abstract mathematics
    "PHY2048": "1504711434969-e33886168f5c",  # mechanical gears
    "PCB3063": "1519638831568-d9897f54ed69",  # DNA / genetics
    "CHM3210": "1554475900-0a0350e3fc7b",     # molecular model structure
    "PHY2049": "1537420327992-d6e192287183",  # lightning / electricity
    "BCH3023": "1617791160505-6f00504e3519",  # academic science setting
}

# ---------------------------------------------------------------------------
# Notebook definitions
# ---------------------------------------------------------------------------

NOTEBOOKS = [
    # Semester 1
    {
        "key": "BSC2010",
        "title": "Intro to Biology",
        "course_code": "BSC2010",
        "description": "Foundational principles of life: cell structure, metabolism, genetics, and evolution.",
        "semester": "Fall 2025",
    },
    {
        "key": "CHM2045",
        "title": "General Chemistry I",
        "course_code": "CHM2045",
        "description": "Atomic structure, bonding, stoichiometry, and thermodynamics fundamentals.",
        "semester": "Fall 2025",
    },
    {
        "key": "MAC2311",
        "title": "Calculus I",
        "course_code": "MAC2311",
        "description": "Limits, derivatives, and an introduction to integration.",
        "semester": "Fall 2025",
    },
    # Semester 2
    {
        "key": "BSC2011",
        "title": "Biology II: Diversity of Life",
        "course_code": "BSC2011",
        "description": "Continuation of BSC2010 covering ecology, classification, and multicellular life.",
        "semester": "Spring 2026",
    },
    {
        "key": "CHM2046",
        "title": "General Chemistry II",
        "course_code": "CHM2046",
        "description": "Equilibrium, kinetics, electrochemistry, and solutions — building on CHM2045.",
        "semester": "Spring 2026",
    },
    {
        "key": "MAC2312",
        "title": "Calculus II",
        "course_code": "MAC2312",
        "description": "Techniques of integration, sequences, series, and polar coordinates.",
        "semester": "Spring 2026",
    },
    {
        "key": "PHY2048",
        "title": "Physics I: Mechanics",
        "course_code": "PHY2048",
        "description": "Classical mechanics — kinematics, Newton's laws, energy, and momentum.",
        "semester": "Spring 2026",
    },
    # Semester 3
    {
        "key": "PCB3063",
        "title": "Genetics",
        "course_code": "PCB3063",
        "description": "Mendelian and molecular genetics, inheritance patterns, mutation, and genomics.",
        "semester": "Fall 2026",
    },
    {
        "key": "CHM3210",
        "title": "Organic Chemistry I",
        "course_code": "CHM3210",
        "description": "Structure, bonding, and reactivity of carbon compounds; nomenclature and mechanisms.",
        "semester": "Fall 2026",
    },
    {
        "key": "PHY2049",
        "title": "Physics II: E&M",
        "course_code": "PHY2049",
        "description": "Electrostatics, circuits, magnetism, and Maxwell's equations.",
        "semester": "Fall 2026",
    },
    {
        "key": "BCH3023",
        "title": "Biochemistry",
        "course_code": "BCH3023",
        "description": "Molecular basis of life — proteins, enzymes, metabolism, and nucleic acid chemistry.",
        "semester": "Fall 2026",
    },
]

# ---------------------------------------------------------------------------
# Notepage definitions  (≥3 per notebook)
# ---------------------------------------------------------------------------

NOTES = {
    "BSC2010": [
        {
            "title": "Lecture 1: The Chemistry of Life",
            "content": """# The Chemistry of Life
**Date:** August 28 | **Lecture:** 1 of 32

---

## Key Vocabulary

| Term | Definition |
|------|-----------|
| Atom | Smallest unit of an element that retains chemical properties |
| Covalent bond | Shared electron pair between two atoms |
| Hydrogen bond | Weak attraction between a δ⁺ hydrogen and a δ⁻ atom (N, O, F) |
| pH | Measure of H⁺ concentration; scale of 0–14 |

---

## Water and Its Properties

Water is essential to life because of four emergent properties:

1. **Cohesion & Adhesion** — water molecules stick to each other (cohesion) and to other polar surfaces (adhesion); enables capillary action in plants
2. **High Specific Heat** — resists temperature change; stabilizes climate and internal body temperature
3. **Expansion Upon Freezing** — ice is less dense than liquid water; allows aquatic life to survive under frozen surfaces
4. **Solvent Versatility** — "universal solvent" for ionic and polar substances

> Prof. note: "If you forget everything else, remember that water's hydrogen bonding is the reason life as we know it is possible."

---

## Macromolecules — Overview

| Class | Monomer | Function |
|-------|---------|----------|
| Carbohydrates | Monosaccharides | Energy, structure |
| Proteins | Amino acids | Enzymes, structure, signaling |
| Lipids | Fatty acids / glycerol | Membranes, energy storage |
| Nucleic Acids | Nucleotides | Genetic information |

---

## Key Takeaways

- Life depends on carbon's ability to form 4 stable covalent bonds
- Functional groups (hydroxyl, carboxyl, amino, phosphate) determine molecular behavior
- **Dehydration synthesis** builds polymers; **hydrolysis** breaks them down
""",
        },
        {
            "title": "Lecture 4: Cell Structure and Function",
            "content": """# Cell Structure and Function
**Date:** September 9 | **Lecture:** 4 of 32

---

## Prokaryotes vs. Eukaryotes

| Feature | Prokaryote | Eukaryote |
|---------|-----------|-----------|
| Nucleus | ✗ | ✓ |
| Membrane-bound organelles | ✗ | ✓ |
| Size | 1–10 µm | 10–100 µm |
| Examples | Bacteria, Archaea | Plants, Animals, Fungi |

---

## Key Organelles and Their Functions

- **Nucleus** — contains DNA; site of transcription; bounded by double membrane with nuclear pores
- **Mitochondria** — ATP synthesis via cellular respiration; has own circular DNA (endosymbiotic theory!)
- **Rough ER** — studded with ribosomes; site of protein synthesis and folding
- **Smooth ER** — lipid synthesis and detoxification
- **Golgi Apparatus** — processes, packages, and ships proteins; "postal system of the cell"
- **Lysosome** — contains hydrolytic enzymes; digests waste and foreign material
- **Chloroplast** (plant only) — photosynthesis; contains thylakoids and stroma
- **Cell Wall** (plant/fungi) — structural support; made of cellulose (plants) or chitin (fungi)

---

## Cell Membrane — Fluid Mosaic Model

- **Phospholipid bilayer** — hydrophilic heads face outward, hydrophobic tails face inward
- **Integral proteins** — span the bilayer
- **Peripheral proteins** — surface only
- **Cholesterol** — buffers membrane fluidity in response to temperature

### Transport Types

| Type | Energy Required? | Direction |
|------|-----------------|-----------|
| Simple diffusion | No | High -> Low |
| Facilitated diffusion | No | High -> Low (via protein) |
| Active transport | Yes (ATP) | Low -> High |
| Osmosis | No | High H₂O -> Low H₂O |

---

## Connections to Watch

- Mitochondria in cellular respiration (Lecture 7)
- Chloroplasts in photosynthesis (Lecture 9)
- ER/Golgi in protein synthesis pathway (Lecture 5)
""",
        },
        {
            "title": "Lecture 8: Cellular Respiration",
            "content": """# Cellular Respiration
**Date:** September 25 | **Lecture:** 8 of 32

---

## Overview

Cellular respiration converts chemical energy in glucose into usable ATP.

**Overall equation:**
```
C₆H₁₂O₆ + 6O₂ -> 6CO₂ + 6H₂O + ~30–32 ATP
```

---

## Stage 1: Glycolysis

- **Location:** Cytoplasm
- **Input:** 1 glucose (6C)
- **Output:** 2 pyruvate (3C), 2 ATP net, 2 NADH
- Does not require oxygen — occurs in all living cells
- Key enzyme: **Phosphofructokinase (PFK)** — rate-limiting step

---

## Stage 2: Pyruvate Oxidation + Krebs Cycle

- **Location:** Mitochondrial matrix
- Pyruvate -> Acetyl-CoA + CO₂ (pyruvate oxidation)
- Acetyl-CoA enters the **Krebs (Citric Acid) Cycle**
- Per glucose: produces 2 ATP, 6 NADH, 2 FADH₂, 4 CO₂

---

## Stage 3: Electron Transport Chain (ETC) + Oxidative Phosphorylation

- **Location:** Inner mitochondrial membrane
- NADH and FADH₂ donate electrons to protein complexes (I, II, III, IV)
- Electrons passed down chain -> proton (H⁺) gradient created
- **ATP synthase** uses proton gradient to synthesize ~26–28 ATP
- O₂ is the **final electron acceptor** -> forms H₂O

---

## Fermentation (When O₂ is Absent)

| Type | Products | Example Organism |
|------|---------|-----------------|
| Lactic acid | Lactate | Muscle cells, Lactobacillus |
| Alcoholic | Ethanol + CO₂ | Yeast |

> ⚠️ Fermentation regenerates NAD⁺ so glycolysis can continue — it does NOT produce additional ATP beyond glycolysis.

---

## Summary — ATP Yield Per Glucose

| Stage | ATP Yield |
|-------|-----------|
| Glycolysis | 2 |
| Krebs Cycle | 2 |
| ETC | ~28 |
| **Total** | **~30–32** |
""",
        },
        {
            "title": "Lecture 12: Photosynthesis",
            "content": """# Photosynthesis
**Date:** October 7 | **Lecture:** 12 of 32

---

## Overview

Photosynthesis converts light energy into chemical energy stored as glucose.

**Overall equation:**
```
6CO₂ + 6H₂O + light energy -> C₆H₁₂O₆ + 6O₂
```

Location: **Chloroplast** (thylakoids for light reactions; stroma for Calvin cycle)

---

## Light-Dependent Reactions (Thylakoid Membrane)

1. Photosystem II absorbs light -> splits water -> releases O₂ + H⁺ + electrons
2. Electrons pass through electron transport chain -> generates ATP (photophosphorylation)
3. Photosystem I re-energizes electrons -> NADPH produced

**Outputs:** ATP, NADPH, O₂

---

## Calvin Cycle (Light-Independent Reactions, Stroma)

Three phases:
1. **Carbon fixation** — CO₂ + RuBP (5C) -> 2× 3-PGA (3C); enzyme: **RuBisCO**
2. **Reduction** — ATP + NADPH convert 3-PGA -> G3P
3. **Regeneration** — G3P -> RuBP (uses ATP)

**Net output per 3 CO₂:** 1 G3P (which feeds into glucose synthesis)

---

## Comparison: Photosynthesis vs. Cellular Respiration

| Feature | Photosynthesis | Cellular Respiration |
|---------|---------------|---------------------|
| Energy source | Light | Glucose |
| Reactants | CO₂, H₂O | O₂, Glucose |
| Products | O₂, Glucose | CO₂, H₂O, ATP |
| Location | Chloroplast | Mitochondria / Cytoplasm |
| Direction | Stores energy | Releases energy |

---

## Key Concepts

- **Chlorophyll a/b** absorb red and blue light; reflect green (why plants appear green)
- **Photorespiration** — RuBisCO binds O₂ instead of CO₂ (wasteful; reduced in C4 and CAM plants)
- **C4 plants** (corn, sugarcane) pre-fix CO₂ in mesophyll cells to avoid photorespiration
""",
        },
    ],

    "CHM2045": [
        {
            "title": "Lecture 1: Atomic Structure",
            "content": """# Atomic Structure
**Date:** August 26 | **Lecture:** 1 of 30

---

## Subatomic Particles

| Particle | Symbol | Charge | Location | Mass (amu) |
|----------|--------|--------|----------|------------|
| Proton | p⁺ | +1 | Nucleus | 1.0073 |
| Neutron | n⁰ | 0 | Nucleus | 1.0087 |
| Electron | e⁻ | −1 | Orbitals | 0.000549 |

- **Atomic number (Z)** = number of protons
- **Mass number (A)** = protons + neutrons
- **Isotopes** = same Z, different A (e.g., ¹²C and ¹⁴C)

---

## Quantum Mechanical Model

Electrons occupy **atomic orbitals** — regions of probability.

### Quantum Numbers

| Number | Symbol | Values | Describes |
|--------|--------|--------|-----------|
| Principal | n | 1, 2, 3, … | Energy level / shell |
| Angular momentum | l | 0 to n−1 | Subshell (s, p, d, f) |
| Magnetic | mₗ | −l to +l | Orbital orientation |
| Spin | mₛ | +½ or −½ | Electron spin |

### Orbital Shapes

- **s** (l=0): spherical, 1 orbital
- **p** (l=1): dumbbell-shaped, 3 orbitals
- **d** (l=2): cloverleaf, 5 orbitals
- **f** (l=3): complex, 7 orbitals

---

## Electron Configuration Rules

1. **Aufbau principle** — fill lowest energy orbitals first
2. **Pauli exclusion** — no two electrons share the same 4 quantum numbers
3. **Hund's rule** — one electron per orbital before pairing (maximize spin)

**Fill order:** 1s -> 2s -> 2p -> 3s -> 3p -> 4s -> 3d -> 4p …

**Example — Fe (Z=26):** [Ar] 3d⁶ 4s²

---

## Periodic Trends

| Trend | Across Period (->) | Down Group (↓) |
|-------|------------------|----------------|
| Atomic radius | Decreases | Increases |
| Ionization energy | Increases | Decreases |
| Electronegativity | Increases | Decreases |
| Electron affinity | Increases | Decreases |
""",
        },
        {
            "title": "Lecture 5: Chemical Bonding",
            "content": """# Chemical Bonding
**Date:** September 11 | **Lecture:** 5 of 30

---

## Types of Chemical Bonds

| Bond Type | Mechanism | Example | ΔEN |
|-----------|-----------|---------|-----|
| Ionic | Electron transfer | NaCl | > 1.7 |
| Covalent (polar) | Unequal electron sharing | H₂O | 0.5–1.7 |
| Covalent (nonpolar) | Equal electron sharing | H₂ | < 0.5 |
| Metallic | Electron sea model | Fe, Cu | — |

---

## Lewis Structures

Steps:
1. Count total valence electrons
2. Connect atoms with single bonds
3. Complete octets on terminal atoms
4. Place remaining electrons on central atom
5. Convert lone pairs to multiple bonds if central atom lacks octet

**Formal Charge** = Valence electrons − Lone pair electrons − ½(Bonding electrons)

**Resonance** — molecules with multiple valid Lewis structures (e.g., O₃, benzene)

---

## VSEPR Theory

Electron pairs repel -> geometry minimizes repulsion.

| Electron Domains | Lone Pairs | Geometry | Bond Angle |
|-----------------|-----------|----------|------------|
| 2 | 0 | Linear | 180° |
| 3 | 0 | Trigonal planar | 120° |
| 4 | 0 | Tetrahedral | 109.5° |
| 4 | 1 | Trigonal pyramidal | ~107° |
| 4 | 2 | Bent | ~104.5° |
| 5 | 0 | Trigonal bipyramidal | 90°, 120° |
| 6 | 0 | Octahedral | 90° |

---

## Orbital Hybridization

| Hybridization | Geometry | Bond Angle | Example |
|---------------|----------|------------|---------|
| sp | Linear | 180° | BeCl₂, C₂H₂ |
| sp² | Trigonal planar | 120° | BF₃, C₂H₄ |
| sp³ | Tetrahedral | 109.5° | CH₄, H₂O |
| sp³d | Trigonal bipyramidal | 90°/120° | PCl₅ |
| sp³d² | Octahedral | 90° | SF₆ |

---

## Molecular Polarity

A molecule is polar if:
- It contains polar bonds **AND**
- The geometry does not cancel bond dipoles

**Polar:** H₂O, NH₃, HCl
**Nonpolar:** CO₂, BF₃, CCl₄ (symmetric cancellation)
""",
        },
        {
            "title": "Lecture 9: Stoichiometry",
            "content": """# Stoichiometry
**Date:** September 25 | **Lecture:** 9 of 30

---

## The Mole Concept

- **1 mole** = 6.022 × 10²³ particles (Avogadro's number)
- **Molar mass** = mass of 1 mole of a substance (g/mol)
  - Equal to atomic/molecular weight in g/mol

**Conversions:**
```
grams ÷ molar mass = moles
moles × molar mass = grams
moles × 6.022×10²³ = particles
```

---

## Empirical vs. Molecular Formula

- **Empirical formula** — simplest whole-number ratio of atoms
- **Molecular formula** — actual number of atoms; multiple of empirical

**Finding empirical formula from % composition:**
1. Assume 100 g sample -> % = grams
2. Convert grams to moles
3. Divide by smallest mole value
4. Round to whole numbers

---

## Balancing Chemical Equations

**Law of Conservation of Mass** — atoms are neither created nor destroyed.

Example:
```
_Fe + _O₂ -> _Fe₂O₃
4 Fe + 3 O₂ -> 2 Fe₂O₃  ✓
```

---

## Stoichiometric Calculations

**Mole ratio** from balanced equation is the conversion factor.

**Limiting Reagent** — reactant consumed first; limits product yield.

Steps:
1. Convert all reactants to moles
2. Divide each by its stoichiometric coefficient
3. Smallest result -> limiting reagent

**Percent Yield:**
```
% yield = (actual yield / theoretical yield) × 100
```

---

## Solution Stoichiometry

**Molarity (M)** = moles solute / liters solution

**Dilution:** M₁V₁ = M₂V₂

**Titration** — uses known concentration to find unknown:
```
moles acid = moles base  (at equivalence point for 1:1 reaction)
M_a × V_a = M_b × V_b
```
""",
        },
    ],

    "MAC2311": [
        {
            "title": "Lecture 1: Limits and Continuity",
            "content": """# Limits and Continuity
**Date:** August 25 | **Lecture:** 1 of 28

---

## Informal Definition of a Limit

lim_{x->a} f(x) = L means f(x) gets arbitrarily close to L as x approaches a (but x ≠ a).

The **limit exists** only if the left-hand limit and right-hand limit are equal:
```
lim_{x->a⁻} f(x) = lim_{x->a⁺} f(x) = L
```

---

## Limit Laws

If lim f(x) = L and lim g(x) = M, then:

| Law | Result |
|-----|--------|
| Sum | lim [f + g] = L + M |
| Difference | lim [f − g] = L − M |
| Product | lim [f · g] = L · M |
| Quotient | lim [f / g] = L / M (M ≠ 0) |
| Power | lim [f^n] = L^n |

---

## Special Limits

```
lim_{x->0} (sin x)/x = 1

lim_{x->0} (1 − cos x)/x = 0

lim_{x->∞} (1 + 1/x)^x = e
```

---

## Continuity

f is continuous at x = a if all three hold:
1. f(a) is defined
2. lim_{x->a} f(x) exists
3. lim_{x->a} f(x) = f(a)

### Types of Discontinuity

| Type | Description |
|------|-------------|
| Removable | Hole in graph; limit exists but ≠ f(a) |
| Jump | Left ≠ right limit |
| Infinite | Vertical asymptote |

---

## Intermediate Value Theorem (IVT)

If f is continuous on [a, b] and N is between f(a) and f(b), then there exists c in (a, b) such that f(c) = N.

**Application:** Proving roots exist — if f(a) < 0 and f(b) > 0, a root must lie in (a, b).
""",
        },
        {
            "title": "Lecture 6: Derivatives and Differentiation Rules",
            "content": """# Derivatives and Differentiation Rules
**Date:** September 17 | **Lecture:** 6 of 28

---

## Definition of the Derivative

```
f'(x) = lim_{h->0} [f(x+h) − f(x)] / h
```

Geometrically: slope of the tangent line to f at x.

---

## Basic Differentiation Rules

| Rule | Formula |
|------|---------|
| Constant | d/dx [c] = 0 |
| Power | d/dx [xⁿ] = nxⁿ⁻¹ |
| Constant multiple | d/dx [cf] = c·f' |
| Sum/Difference | d/dx [f ± g] = f' ± g' |
| Product | d/dx [fg] = f'g + fg' |
| Quotient | d/dx [f/g] = (f'g − fg') / g² |
| Chain | d/dx [f(g(x))] = f'(g(x))·g'(x) |

---

## Derivatives of Common Functions

| Function | Derivative |
|----------|-----------|
| sin x | cos x |
| cos x | −sin x |
| tan x | sec²x |
| eˣ | eˣ |
| ln x | 1/x |
| aˣ | aˣ ln a |
| log_a x | 1/(x ln a) |

---

## Implicit Differentiation

Used when y cannot be isolated explicitly.

**Example:** x² + y² = 25
```
2x + 2y · dy/dx = 0
dy/dx = −x/y
```

---

## Related Rates

1. Identify all quantities changing with time
2. Write equation relating them
3. Differentiate both sides with respect to t
4. Substitute known values and solve

**Example:** Ladder sliding down wall — relate x(t) and y(t) via x² + y² = L².
""",
        },
        {
            "title": "Lecture 12: Introduction to Integration",
            "content": """# Introduction to Integration
**Date:** October 20 | **Lecture:** 12 of 28

---

## Antiderivatives

F is an antiderivative of f if F'(x) = f(x).

The **general antiderivative** includes +C (constant of integration).

**Basic Antiderivatives:**

| Function | Antiderivative |
|----------|---------------|
| xⁿ (n≠−1) | xⁿ⁺¹/(n+1) + C |
| 1/x | ln|x| + C |
| eˣ | eˣ + C |
| sin x | −cos x + C |
| cos x | sin x + C |
| sec²x | tan x + C |

---

## Definite Integrals — Riemann Sums

Area under curve approximated by summing rectangle areas:

```
∫_a^b f(x) dx = lim_{n->∞} Σ f(xᵢ*) · Δx
```

where Δx = (b−a)/n

---

## Fundamental Theorem of Calculus

**Part 1:** If F(x) = ∫_a^x f(t) dt, then F'(x) = f(x)

**Part 2:** ∫_a^b f(x) dx = F(b) − F(a)  (where F' = f)

Connects differentiation and integration!

---

## Properties of Definite Integrals

- ∫_a^a f dx = 0
- ∫_a^b f dx = −∫_b^a f dx
- ∫_a^b [f+g] dx = ∫_a^b f dx + ∫_a^b g dx
- ∫_a^b cf dx = c ∫_a^b f dx

---

## Substitution Rule (u-substitution)

Let u = g(x), then du = g'(x) dx:

```
∫ f(g(x))·g'(x) dx = ∫ f(u) du
```

**Example:** ∫ 2x·sin(x²) dx -> let u = x², du = 2x dx -> ∫ sin(u) du = −cos(u) + C = −cos(x²) + C
""",
        },
    ],

    "BSC2011": [
        {
            "title": "Lecture 1: Ecology and Population Dynamics",
            "content": """# Ecology and Population Dynamics
**Date:** January 10 | **Lecture:** 1 of 30

---

## Levels of Ecological Organization

Individual -> Population -> Community -> Ecosystem -> Biome -> Biosphere

- **Population** — group of the same species in a defined area
- **Community** — all populations in an area
- **Ecosystem** — community + abiotic environment

---

## Population Growth Models

### Exponential Growth

```
dN/dt = rN
```

- r = intrinsic rate of increase (birth rate − death rate)
- Produces J-shaped curve — unlimited resources assumed
- Rare in nature; occurs after colonization events

### Logistic Growth

```
dN/dt = rN[(K−N)/K]
```

- K = carrying capacity (max sustainable population size)
- Produces S-shaped (sigmoidal) curve
- Growth slows as N approaches K

---

## Survivorship Curves

| Type | Description | Example |
|------|-------------|---------|
| Type I | Low early mortality, high late mortality | Humans, elephants |
| Type II | Constant mortality throughout life | Birds, rodents |
| Type III | High early mortality, low late mortality | Fish, oysters, plants |

---

## Population Interactions

| Interaction | Species A | Species B | Example |
|-------------|----------|----------|---------|
| Competition | − | − | Two plant species |
| Predation | + | − | Wolf/deer |
| Mutualism | + | + | Bee/flower |
| Commensalism | + | 0 | Barnacle/whale |
| Parasitism | + | − | Tapeworm/host |

---

## Key Concepts

- **Density-dependent factors** — disease, competition (effect scales with N)
- **Density-independent factors** — weather, fire (effect independent of N)
- **Allee effect** — below a minimum population, individuals struggle to find mates -> extinction risk
""",
        },
        {
            "title": "Lecture 5: Classification and Phylogenetics",
            "content": """# Classification and Phylogenetics
**Date:** January 28 | **Lecture:** 5 of 30

---

## Taxonomy — Linnaean System

**Hierarchy (mnemonic: "Dear King Phillip Came Over For Good Soup"):**

Domain -> Kingdom -> Phylum -> Class -> Order -> Family -> Genus -> Species

- **Binomial nomenclature:** *Genus species* (italicized, Genus capitalized)
- Example: *Homo sapiens*

---

## The Three Domains

| Domain | Cell Type | Example Organisms |
|--------|-----------|------------------|
| Bacteria | Prokaryote | E. coli, Streptococcus |
| Archaea | Prokaryote | Methanogens, thermophiles |
| Eukarya | Eukaryote | Plants, animals, fungi, protists |

---

## Phylogenetic Trees

- **Clade (monophyletic group)** — ancestor + all its descendants
- **Ancestral traits** — inherited from distant common ancestor
- **Derived traits** — evolved more recently; shared by members of a clade
- **Parsimony** — prefer simplest tree (fewest evolutionary changes)

### Reading a Tree

- Branch points = common ancestors
- Terminal nodes = extant taxa
- Sister taxa = most closely related lineages

---

## Molecular Phylogenetics

- DNA/protein sequences compared to infer evolutionary relationships
- **Molecular clock** — neutral mutations accumulate at roughly constant rate -> estimate divergence times
- **16S rRNA** — universal marker used to classify prokaryotes

---

## Major Eukaryotic Clades

| Group | Key Features |
|-------|-------------|
| Opisthokonta | Animals + Fungi (posterior flagellum) |
| Viridiplantae | Land plants + green algae |
| Alveolata | Ciliates, dinoflagellates, Plasmodium |
| Rhizaria | Foraminifera, radiolarians |
""",
        },
        {
            "title": "Lecture 9: Multicellular Life — Plants",
            "content": """# Multicellular Life — Plants
**Date:** February 14 | **Lecture:** 9 of 30

---

## Plant Evolution — Key Transitions

1. **Aquatic green algae** (ancestor)
2. **Bryophytes** (mosses, liverworts) — nonvascular, must stay moist
3. **Seedless vascular plants** (ferns) — lignified vascular tissue; still need water for fertilization
4. **Gymnosperms** (conifers) — seeds but no flowers or fruit; pollen = no water needed
5. **Angiosperms** (flowering plants) — seeds enclosed in fruit; dominant today

---

## Plant Tissue Systems

| System | Tissue | Function |
|--------|--------|----------|
| Dermal | Epidermis, cuticle | Protection, gas exchange (stomata) |
| Vascular | Xylem, Phloem | Water/mineral transport (xylem); sugar transport (phloem) |
| Ground | Parenchyma, collenchyma, sclerenchyma | Storage, photosynthesis, support |

---

## Transport in Plants

### Water Transport (Xylem)
- Driven by **transpiration-cohesion-tension** mechanism
- Stomata open -> water evaporates -> tension pulls water column up from roots
- Aquaporins and root pressure contribute

### Sugar Transport (Phloem)
- **Pressure-flow hypothesis** — sugar loaded into phloem at source (leaf) -> increases osmotic pressure -> water follows -> pushes sap to sink (roots, fruits)

---

## Plant Hormones

| Hormone | Effect |
|---------|--------|
| Auxin (IAA) | Cell elongation; phototropism |
| Gibberellins | Stem elongation; seed germination |
| Cytokinins | Cell division; delay senescence |
| Ethylene | Fruit ripening; leaf drop |
| Abscisic acid (ABA) | Stomatal closure; dormancy |

---

## Angiosperm Reproduction

- **Stamens** — male; produce pollen (gametophyte in pollen grain)
- **Carpels** — female; contain ovules; stigma receives pollen
- **Double fertilization** (unique to angiosperms): one sperm + egg = zygote; second sperm + polar nuclei = triploid endosperm
""",
        },
    ],

    "CHM2046": [
        {
            "title": "Lecture 1: Chemical Equilibrium",
            "content": """# Chemical Equilibrium
**Date:** January 8 | **Lecture:** 1 of 30

---

## The Concept of Equilibrium

For a reversible reaction:
```
aA + bB ⇌ cC + dD
```

At equilibrium, forward rate = reverse rate; concentrations remain constant (not necessarily equal).

---

## Equilibrium Constant Expression

```
K_c = [C]^c [D]^d / [A]^a [B]^b
```

- **K_c** — equilibrium constant in terms of molar concentration
- **K_p** — equilibrium constant in terms of partial pressures
- **Relationship:** K_p = K_c(RT)^Δn  where Δn = moles gas products − moles gas reactants

### Rules

- Pure solids and pure liquids are **omitted** from K expressions
- K >> 1 -> products favored; K << 1 -> reactants favored

---

## Reaction Quotient (Q)

Q uses actual (non-equilibrium) concentrations:

| Relationship | Implication |
|-------------|-------------|
| Q < K | Reaction proceeds forward |
| Q > K | Reaction proceeds in reverse |
| Q = K | System at equilibrium |

---

## Le Chatelier's Principle

A system at equilibrium shifts to minimize the effect of a stress.

| Stress | Direction of Shift |
|--------|-------------------|
| Add reactant | Forward |
| Remove product | Forward |
| Increase pressure (decrease V) | Toward fewer moles of gas |
| Increase temperature | Toward endothermic direction |
| Add catalyst | No shift (equilibrium reached faster) |

---

## ICE Table Method

**Initial / Change / Equilibrium** — used to find equilibrium concentrations.

```
         A    +    B    ⇌    C
Initial   a        b         0
Change   −x       −x        +x
Equil.  a−x      b−x         x

Then set up: K = x / [(a−x)(b−x)]
```
""",
        },
        {
            "title": "Lecture 5: Kinetics — Reaction Rates",
            "content": """# Kinetics — Reaction Rates
**Date:** January 28 | **Lecture:** 5 of 30

---

## Reaction Rate

Rate of reaction = change in concentration per unit time.

```
rate = −(1/a) Δ[A]/Δt = +(1/c) Δ[C]/Δt
```

(negative for reactants, positive for products; divided by stoichiometric coefficients)

---

## Rate Laws

The rate law must be **determined experimentally** — not from stoichiometry.

```
rate = k[A]^m [B]^n
```

- k = rate constant (temperature dependent)
- m, n = reaction orders with respect to each reactant
- Overall order = m + n

### Determining Order from Initial Rate Data

Compare experiments where one reactant concentration is changed:
```
rate₂/rate₁ = ([A]₂/[A]₁)^m  ->  solve for m
```

---

## Integrated Rate Laws

| Order | Integrated Law | Linear Plot | Half-life |
|-------|----------------|-------------|-----------|
| 0 | [A] = [A]₀ − kt | [A] vs t | [A]₀/2k |
| 1 | ln[A] = ln[A]₀ − kt | ln[A] vs t | 0.693/k |
| 2 | 1/[A] = 1/[A]₀ + kt | 1/[A] vs t | 1/(k[A]₀) |

---

## Arrhenius Equation

Rate constant k depends on temperature:

```
k = A·e^(−Ea/RT)
ln k = ln A − Ea/(RT)
```

- Eₐ = activation energy (J/mol)
- A = frequency factor
- R = 8.314 J/mol·K
- Higher T or lower Eₐ -> larger k -> faster reaction

---

## Reaction Mechanisms

A mechanism is a series of **elementary steps** that sum to the overall reaction.

- **Rate-determining step (RDS)** — slowest step; dictates the overall rate law
- **Intermediate** — produced in one step, consumed in another (not in overall equation)
- **Catalyst** — appears as reactant in one step, regenerated in later step
""",
        },
        {
            "title": "Lecture 10: Electrochemistry",
            "content": """# Electrochemistry
**Date:** February 18 | **Lecture:** 10 of 30

---

## Oxidation-Reduction (Redox) Reactions

- **Oxidation** — loss of electrons (OIL)
- **Reduction** — gain of electrons (RIG)
- **Oxidizing agent** — causes oxidation; is itself reduced
- **Reducing agent** — causes reduction; is itself oxidized

**Mnemonic:** OIL RIG — Oxidation Is Loss, Reduction Is Gain

---

## Balancing Redox Reactions (Half-Reaction Method)

1. Split into oxidation and reduction half-reactions
2. Balance all elements except H and O
3. Balance O with H₂O
4. Balance H with H⁺
5. Balance charge with electrons
6. Multiply half-reactions so electrons cancel
7. Add and simplify

(In basic solution: add OH⁻ to neutralize H⁺)

---

## Galvanic (Voltaic) Cells

Spontaneous redox reaction -> electrical energy.

- **Anode** — oxidation (negative electrode in galvanic cell)
- **Cathode** — reduction (positive electrode)
- **Salt bridge** — maintains electrical neutrality

**Cell notation:**
```
Zn(s) | Zn²⁺(aq) ‖ Cu²⁺(aq) | Cu(s)
 anode                          cathode
```

---

## Standard Cell Potential

```
E°_cell = E°_cathode − E°_anode
```

- E° > 0 -> spontaneous reaction
- Standard reduction potentials from tables (vs. SHE = 0 V)

---

## Nernst Equation

For non-standard conditions:

```
E = E° − (RT/nF) ln Q = E° − (0.0592/n) log Q  (at 25°C)
```

- n = number of electrons transferred
- F = Faraday's constant = 96,485 C/mol e⁻

**At equilibrium:** E = 0, so E° = (0.0592/n) log K

---

## Electrolytic Cells

Non-spontaneous redox reaction driven by external electrical energy.

**Faraday's law of electrolysis:**
```
mass deposited = (I · t / F) × (molar mass / n)
```
""",
        },
    ],

    "MAC2312": [
        {
            "title": "Lecture 1: Integration Techniques",
            "content": """# Integration Techniques
**Date:** January 8 | **Lecture:** 1 of 28

---

## Review: u-Substitution

Let u = g(x), du = g'(x) dx:
```
∫ f(g(x)) g'(x) dx = ∫ f(u) du
```

**Key skill:** Identify the "inside function" and its derivative in the integrand.

---

## Integration by Parts

Derived from product rule:
```
∫ u dv = uv − ∫ v du
```

**LIATE priority for choosing u:** Logarithm, Inverse trig, Algebraic, Trig, Exponential

**Example:** ∫ x·eˣ dx
- u = x, dv = eˣ dx -> du = dx, v = eˣ
- = x·eˣ − ∫ eˣ dx = x·eˣ − eˣ + C = eˣ(x−1) + C

---

## Trigonometric Integrals

### Powers of sin and cos:
- **Odd power:** save one factor, convert rest using sin²x + cos²x = 1, then substitute
- **Even power:** use half-angle formulas: sin²x = (1−cos2x)/2, cos²x = (1+cos2x)/2

### Powers of tan and sec:
- **Even power of sec:** factor out sec²x (= du if u = tan x), convert remaining sec² using 1 + tan²x = sec²x

---

## Trigonometric Substitution

| Expression | Substitution | Identity Used |
|-----------|-------------|--------------|
| √(a²−x²) | x = a sin θ | 1−sin²θ = cos²θ |
| √(a²+x²) | x = a tan θ | 1+tan²θ = sec²θ |
| √(x²−a²) | x = a sec θ | sec²θ−1 = tan²θ |

---

## Partial Fraction Decomposition

For rational functions (degree numerator < degree denominator):

```
(x+3)/[(x−1)(x+2)] = A/(x−1) + B/(x+2)
```

Multiply both sides by denominator, then solve for A, B by substituting convenient values of x.

**Repeated factors:** (x−1)² requires A/(x−1) + B/(x−1)²
**Irreducible quadratics:** (x²+1) requires (Ax+B)/(x²+1)
""",
        },
        {
            "title": "Lecture 6: Sequences and Series",
            "content": """# Sequences and Series
**Date:** February 5 | **Lecture:** 6 of 28

---

## Sequences

A sequence {aₙ} is a list of numbers in a defined order.

- **Limit of a sequence:** lim_{n->∞} aₙ = L (sequence converges); DNE = diverges
- **Squeeze Theorem** applies to sequences
- **Monotone Convergence Theorem:** A bounded, monotone sequence converges

---

## Series

A series is the sum of a sequence:
```
Σ_{n=1}^∞ aₙ = a₁ + a₂ + a₃ + …
```

Defined as limit of **partial sums:** Sₙ = a₁ + a₂ + … + aₙ

If lim Sₙ = S, the series converges to S.

---

## Geometric Series

```
Σ_{n=0}^∞ arⁿ = a/(1−r)   if |r| < 1
```

Diverges if |r| ≥ 1.

---

## Convergence Tests

| Test | Used For | Condition for Convergence |
|------|---------|--------------------------|
| Divergence (nth-term) | Any | Diverges if lim aₙ ≠ 0 |
| Integral | Positive, decreasing f | ∫_1^∞ f(x) dx converges |
| p-series | Σ 1/nᵖ | p > 1 |
| Comparison | Positive terms | aₙ ≤ bₙ and Σbₙ converges |
| Limit Comparison | Positive terms | lim (aₙ/bₙ) = L > 0 |
| Ratio | Any | lim |a_{n+1}/aₙ| < 1 |
| Root | Any | lim |aₙ|^{1/n} < 1 |
| Alternating Series | Alternating sign | Decreasing to 0 |

---

## Power Series

```
Σ_{n=0}^∞ cₙ(x−a)ⁿ
```

- **Radius of convergence (R):** use ratio test on |cₙ|
- **Interval of convergence:** (a−R, a+R); check endpoints separately

**Taylor/Maclaurin Series:**
```
eˣ = Σ xⁿ/n!
sin x = Σ (−1)ⁿ x^{2n+1}/(2n+1)!
cos x = Σ (−1)ⁿ x^{2n}/(2n)!
1/(1−x) = Σ xⁿ   (|x| < 1)
```
""",
        },
        {
            "title": "Lecture 10: Polar Coordinates and Parametric Equations",
            "content": """# Polar Coordinates and Parametric Equations
**Date:** March 10 | **Lecture:** 10 of 28

---

## Parametric Equations

A curve can be described by:
```
x = f(t),  y = g(t)
```

- **dy/dx** = (dy/dt) / (dx/dt)  [slope of tangent]
- **d²y/dx²** = (d/dt[dy/dx]) / (dx/dt)  [concavity]

**Arc length:**
```
L = ∫_a^b √[(dx/dt)² + (dy/dt)²] dt
```

---

## Polar Coordinates

A point P is described by (r, θ):
- r = distance from origin
- θ = angle from positive x-axis

**Conversion:**
```
x = r cos θ,  y = r sin θ
r² = x² + y²,  tan θ = y/x
```

---

## Common Polar Curves

| Name | Equation | Shape |
|------|---------|-------|
| Circle | r = a | Circle centered at origin |
| Cardioid | r = a(1 + cos θ) | Heart-shaped |
| Rose | r = a cos(nθ) | n petals (n even -> 2n petals) |
| Lemniscate | r² = a² cos(2θ) | Figure-8 |
| Limaçon | r = a + b cos θ | Dimpled or looped |

---

## Area in Polar Coordinates

```
A = (1/2) ∫_α^β r² dθ
```

**Area between curves:** A = (1/2) ∫ [r_outer² − r_inner²] dθ

---

## Arc Length in Polar

```
L = ∫_α^β √[r² + (dr/dθ)²] dθ
```

---

## Key Tips

- Find intersections: set r₁ = r₂ **and** check the pole (r = 0 may occur at different θ values)
- Symmetry rules: check if r(−θ) = r(θ) [x-axis], r(π−θ) = r(θ) [y-axis], r(−θ) = −r(θ) [origin]
""",
        },
    ],

    "PHY2048": [
        {
            "title": "Lecture 1: Kinematics",
            "content": """# Kinematics — Motion in 1D and 2D
**Date:** January 9 | **Lecture:** 1 of 30

---

## Key Quantities

| Quantity | Symbol | SI Unit | Vector? |
|---------|--------|---------|---------|
| Position | x, r | m | Yes |
| Displacement | Δx | m | Yes |
| Distance | d | m | No |
| Velocity (avg) | v̄ = Δx/Δt | m/s | Yes |
| Acceleration (avg) | ā = Δv/Δt | m/s² | Yes |

---

## Kinematic Equations (Constant Acceleration)

```
v = v₀ + at
x = x₀ + v₀t + ½at²
v² = v₀² + 2a(x−x₀)
x − x₀ = ½(v₀ + v)t
```

---

## Projectile Motion

Horizontal (x): constant velocity (a_x = 0)
```
x = v₀cos θ · t
```

Vertical (y): free fall (a_y = −g, g = 9.8 m/s²)
```
y = v₀sin θ · t − ½gt²
v_y = v₀sin θ − gt
```

**Range:**
```
R = v₀² sin(2θ) / g
```
Maximum range at θ = 45°

---

## Circular Motion

**Uniform circular motion:** constant speed, direction changes -> centripetal acceleration

```
a_c = v²/r = ω²r   (directed toward center)
```

**Period and frequency:**
```
T = 2πr/v = 2π/ω
f = 1/T,  ω = 2πf
```

---

## Relative Motion

Velocity of A relative to C = Velocity of A relative to B + Velocity of B relative to C:
```
v_AC = v_AB + v_BC
```

Use vector addition — draw diagrams for 2D problems.
""",
        },
        {
            "title": "Lecture 5: Newton's Laws",
            "content": """# Newton's Laws of Motion
**Date:** January 30 | **Lecture:** 5 of 30

---

## Newton's Three Laws

**First Law (Inertia):** An object remains at rest or in uniform motion unless acted upon by a net external force.
- Defines **inertial reference frames**

**Second Law:** F_net = ma
- a is in the direction of F_net
- Larger mass -> smaller acceleration for same force

**Third Law (Action-Reaction):** For every action force, there is an equal and opposite reaction force acting on a different object.

---

## Free Body Diagrams (FBDs)

Steps:
1. Isolate the object of interest
2. Draw all forces acting ON that object (not forces it exerts)
3. Choose a coordinate system (align one axis with acceleration)
4. Apply ΣF = ma in each direction

---

## Common Forces

| Force | Symbol | Direction |
|-------|--------|-----------|
| Gravity | W = mg | Downward |
| Normal | N | Perpendicular to surface |
| Friction (kinetic) | f_k = μ_k N | Opposite to motion |
| Friction (static) | f_s ≤ μ_s N | Opposes tendency to slide |
| Tension | T | Along rope/string, away from object |

---

## Atwood Machine

Two masses m₁ > m₂ over frictionless pulley:

```
a = (m₁ − m₂)g / (m₁ + m₂)
T = 2m₁m₂g / (m₁ + m₂)
```

---

## Inclined Plane

Axes: x along incline, y perpendicular

```
ΣF_x: mg sin θ − f = ma
ΣF_y: N − mg cos θ = 0  ->  N = mg cos θ
```
""",
        },
        {
            "title": "Lecture 10: Energy and Momentum",
            "content": """# Energy, Work, and Momentum
**Date:** February 27 | **Lecture:** 10 of 30

---

## Work

```
W = F · d · cos θ = F⃗ · d⃗
```

- W > 0: force has component in direction of motion
- W < 0: force opposes motion (e.g., friction)
- Units: Joules (J) = N·m

**Work-Energy Theorem:**
```
W_net = ΔKE = ½mv² − ½mv₀²
```

---

## Kinetic and Potential Energy

**Kinetic energy:** KE = ½mv²

**Gravitational PE:** U_g = mgh

**Elastic PE:** U_s = ½kx²  (spring; k = spring constant, x = displacement from equilibrium)

---

## Conservation of Energy

For a system with only conservative forces:
```
KE₁ + PE₁ = KE₂ + PE₂
```

With non-conservative forces (friction, applied force):
```
W_nc = ΔKE + ΔPE = ΔE_mech
```

---

## Power

```
P = W/t = F·v·cos θ
```

Units: Watts (W) = J/s

---

## Linear Momentum

```
p⃗ = mv⃗
```

**Impulse-Momentum Theorem:**
```
J⃗ = F⃗_avg · Δt = Δp⃗
```

**Conservation of Momentum** (no external forces):
```
p⃗_total = constant  ->  m₁v₁ + m₂v₂ = m₁v₁' + m₂v₂'
```

---

## Collisions

| Type | KE Conserved? | Momentum Conserved? |
|------|--------------|---------------------|
| Elastic | Yes | Yes |
| Inelastic | No | Yes |
| Perfectly inelastic | No (max loss) | Yes |

**Perfectly inelastic:** objects stick together -> v' = (m₁v₁ + m₂v₂) / (m₁ + m₂)
""",
        },
    ],

    "PCB3063": [
        {
            "title": "Lecture 1: Mendelian Genetics",
            "content": """# Mendelian Genetics
**Date:** January 10 | **Lecture:** 1 of 28

---

## Mendel's Experiments

Gregor Mendel crossed pea plants (*Pisum sativum*) and tracked traits across generations.

**Key terms:**
- **Allele** — alternative form of a gene
- **Dominant** — allele expressed in heterozygote (A)
- **Recessive** — masked in heterozygote (a)
- **Genotype** — genetic makeup (AA, Aa, aa)
- **Phenotype** — observable trait

---

## Mendel's Laws

**Law of Segregation:** Each organism carries two alleles for each trait; they separate during gamete formation.

**Law of Independent Assortment:** Alleles for different traits assort independently during gamete formation (applies to genes on different chromosomes).

---

## Monohybrid Cross

Aa × Aa:

|   | A | a |
|---|---|---|
| A | AA | Aa |
| a | Aa | aa |

Genotypic ratio: 1 AA : 2 Aa : 1 aa
Phenotypic ratio: 3 dominant : 1 recessive

---

## Dihybrid Cross

AaBb × AaBb:

Phenotypic ratio: **9 A_B_ : 3 A_bb : 3 aaB_ : 1 aabb**

---

## Extensions to Mendelian Genetics

| Phenomenon | Description | Example |
|-----------|-------------|---------|
| Incomplete dominance | Heterozygote intermediate phenotype | Snapdragons (red × white = pink) |
| Codominance | Both alleles expressed | ABO blood type (AB) |
| Pleiotropy | One gene affects multiple traits | Sickle cell anemia |
| Epistasis | One gene masks another | Coat color in dogs |
| Multiple alleles | More than 2 alleles in population | ABO blood type |

---

## Test Cross

Cross unknown genotype × homozygous recessive (aa):
- All dominant phenotype -> AA (homozygous dominant)
- 1:1 dominant:recessive -> Aa (heterozygous)
""",
        },
        {
            "title": "Lecture 5: Molecular Genetics — DNA Structure",
            "content": """# Molecular Genetics — DNA Structure and Replication
**Date:** February 4 | **Lecture:** 5 of 28

---

## DNA Structure

- **Double helix** — two antiparallel strands
- **Backbone** — alternating sugar (deoxyribose) and phosphate groups
- **Bases:** Adenine (A), Thymine (T), Guanine (G), Cytosine (C)
- **Base pairing:** A–T (2 H-bonds), G–C (3 H-bonds) — **Chargaff's rules**
- Strands are antiparallel: 5'->3' paired with 3'->5'

---

## DNA Replication (Semiconservative)

Each new molecule contains one old strand + one new strand.

### Key Enzymes

| Enzyme | Function |
|--------|----------|
| Helicase | Unwinds double helix at origin |
| SSB proteins | Stabilize single-stranded DNA |
| Primase | Synthesizes short RNA primer |
| DNA Polymerase III | Main replication enzyme; extends 5'->3' |
| DNA Polymerase I | Removes RNA primers, fills gaps |
| DNA Ligase | Seals nicks in sugar-phosphate backbone |
| Topoisomerase | Relieves supercoiling ahead of fork |

---

## Leading vs. Lagging Strand

- **Leading strand** — synthesized continuously 5'->3' toward fork
- **Lagging strand** — synthesized discontinuously as **Okazaki fragments** (each needs its own primer)

---

## Mutation Types

| Type | Description | Example |
|------|-------------|---------|
| Point mutation | Single base change | Substitution, transition, transversion |
| Silent | Same amino acid | UUU -> UUC (both Phe) |
| Missense | Different amino acid | Sickle cell: Val -> Glu |
| Nonsense | Premature stop codon | UAU -> UAA |
| Frameshift | Insert/delete shifts reading frame | +1 or −1 nucleotide |

---

## DNA Repair Mechanisms

- **Mismatch repair** — corrects errors missed by proofreading; uses methylation to identify template strand
- **Nucleotide excision repair** — removes bulky lesions (UV-induced pyrimidine dimers)
- **Base excision repair** — removes damaged bases via glycosylases
""",
        },
        {
            "title": "Lecture 9: Gene Expression — Transcription and Translation",
            "content": """# Gene Expression — Transcription and Translation
**Date:** February 25 | **Lecture:** 9 of 28

---

## Central Dogma

```
DNA -> RNA -> Protein
      ↑ transcription  ↑ translation
```

---

## Transcription

**Location:** Nucleus (eukaryotes)

### Key Steps

1. **Initiation** — RNA polymerase binds promoter (TATA box in eukaryotes); with transcription factors
2. **Elongation** — RNA pol reads template 3'->5', synthesizes mRNA 5'->3'
3. **Termination** — RNA pol reaches terminator sequence; mRNA released

### Eukaryotic mRNA Processing (Pre-mRNA -> mRNA)
- **5' cap** (7-methylguanosine) — protects from degradation, aids ribosome binding
- **Poly-A tail** (3' end) — 100–250 A nucleotides added; stability and export
- **Splicing** — introns removed by spliceosome; exons joined

---

## The Genetic Code

- **Codon** — triplet of mRNA nucleotides specifying an amino acid
- 64 codons total; 61 code for amino acids, 3 are stop codons (UAA, UAG, UGA)
- **Redundant/degenerate** — multiple codons for same amino acid
- **Start codon:** AUG (methionine)

---

## Translation

**Location:** Ribosomes (rough ER or cytoplasm)

### Ribosome Structure

- Small subunit (40S eukaryotic): decodes mRNA
- Large subunit (60S): catalyzes peptide bond formation (peptidyl transferase)
- **A site** — aminoacyl-tRNA binding
- **P site** — peptidyl-tRNA (growing chain)
- **E site** — exit; empty tRNA leaves

### Steps

1. **Initiation** — ribosome assembles at AUG; initiator tRNA brings Met
2. **Elongation** — codon recognition -> peptide bond formation -> translocation
3. **Termination** — stop codon -> release factor -> polypeptide released
""",
        },
    ],

    "CHM3210": [
        {
            "title": "Lecture 1: Structure and Bonding in Organic Molecules",
            "content": """# Structure and Bonding in Organic Molecules
**Date:** January 8 | **Lecture:** 1 of 30

---

## Carbon — The Basis of Organic Chemistry

- Carbon forms **4 covalent bonds** (tetravalent)
- Can bond to: C, H, O, N, S, halogens, and more
- Bonds: single (sp³), double (sp²), triple (sp)
- **Hybridization determines geometry:**

| Hybridization | Geometry | Bond Angle | Example |
|---------------|----------|------------|---------|
| sp³ | Tetrahedral | 109.5° | CH₄, C₂H₆ |
| sp² | Trigonal planar | 120° | C₂H₄, benzene |
| sp | Linear | 180° | C₂H₂, CO₂ |

---

## Bonding Models

**σ (sigma) bonds** — head-on overlap; present in all single bonds; rotation allowed
**π (pi) bonds** — side-on overlap; present in double/triple bonds; **no free rotation**

**Double bond** = 1 σ + 1 π
**Triple bond** = 1 σ + 2 π

---

## Resonance Structures

- Molecules may have multiple valid Lewis structures differing only in electron placement
- **Resonance hybrid** = weighted average of all contributors
- More stable contributor: more bonds, more octets satisfied, negative charge on more electronegative atom

**Example:** Carboxylate (COO⁻) — negative charge delocalized over both oxygens

---

## Formal Charge

```
FC = Valence electrons − Lone pair electrons − ½(Bonding electrons)
```

Best Lewis structure: formal charges closest to 0; negative FC on most electronegative atom.

---

## Molecular Representations

| Type | Shows |
|------|-------|
| Condensed structure | CH₃CH₂OH |
| Lewis structure | All bonds and lone pairs |
| Skeletal (line-angle) | Carbons at intersections; H implied |
| 3D wedge-dash | Tetrahedral geometry in 3D |
""",
        },
        {
            "title": "Lecture 5: Functional Groups and Nomenclature",
            "content": """# Functional Groups and Nomenclature
**Date:** February 3 | **Lecture:** 5 of 30

---

## IUPAC Nomenclature — Alkanes

1. Find longest carbon chain -> parent name (meth, eth, prop, but, pent, hex, hept, oct, non, dec)
2. Number chain from end closest to substituent
3. Name substituents as prefixes (methyl, ethyl, etc.)
4. Use alphabetical order for multiple substituents

**Example:** 2-methylpentane, 3-ethyl-2-methylhexane

---

## Common Functional Groups

| Group | Structure | Suffix/Prefix | Class |
|-------|-----------|--------------|-------|
| Alkene | C=C | -ene | Alkene |
| Alkyne | C≡C | -yne | Alkyne |
| Alcohol | −OH | -ol | Alcohol |
| Ether | −O− | ether | Ether |
| Aldehyde | −CHO | -al | Carbonyl |
| Ketone | C=O (internal) | -one | Carbonyl |
| Carboxylic acid | −COOH | -oic acid | Carboxyl |
| Amine | −NH₂ | -amine | Amine |
| Amide | −CONH₂ | -amide | Amide |

---

## Priority (IUPAC Hierarchy)

Highest priority class determines the principal chain suffix; lower priority classes are prefixes.

Order (high -> low): carboxylic acid > aldehyde > ketone > alcohol > amine > alkene > alkyne > alkane

---

## Stereochemistry Vocabulary

- **Isomers** — same molecular formula, different structures
  - **Constitutional (structural) isomers** — different connectivity
  - **Stereoisomers** — same connectivity, different spatial arrangement
    - **Enantiomers** — non-superimposable mirror images
    - **Diastereomers** — stereoisomers that are not mirror images

- **Chiral center** — carbon bonded to 4 different substituents

- **R/S configuration** (CIP rules):
  1. Rank substituents by atomic number (high -> low = 1->4)
  2. Orient lowest priority away from viewer
  3. Clockwise = R; counterclockwise = S
""",
        },
        {
            "title": "Lecture 9: Nucleophilic Substitution and Elimination",
            "content": """# Nucleophilic Substitution and Elimination
**Date:** February 27 | **Lecture:** 9 of 30

---

## Nucleophiles and Electrophiles

- **Nucleophile** — electron-rich; attacks electrophile (e.g., OH⁻, Br⁻, NH₃)
- **Electrophile** — electron-poor; accepts electrons (e.g., R-X at carbon)
- **Leaving group** — atom/group that departs with the bonding electrons (e.g., I⁻, Br⁻, Cl⁻, OTs⁻)

Leaving group ability: I⁻ > Br⁻ > Cl⁻ >> F⁻

---

## SN2 Reaction

**Bimolecular nucleophilic substitution**

- One-step, concerted mechanism
- Rate = k[nucleophile][substrate]
- **Backside attack** -> **inversion of configuration** (Walden inversion)
- Favored by: strong nucleophile, primary (1°) substrate, polar aprotic solvent (DMF, DMSO, acetone)

**Example:**
```
CH₃Br + OH⁻ -> CH₃OH + Br⁻
```

---

## SN1 Reaction

**Unimolecular nucleophilic substitution**

- Two-step: ionization -> nucleophilic attack
- Rate = k[substrate] (nucleophile not in rate law)
- **Carbocation intermediate** -> **racemization** (mixture of R and S)
- Favored by: tertiary (3°) substrate, polar protic solvent (H₂O, ROH), weak nucleophile

---

## Elimination Reactions

### E2 (Bimolecular Elimination)
- Concerted; base abstracts H as C−X breaks
- **Anti-periplanar** requirement (H and X on opposite faces)
- Rate = k[base][substrate]
- Major product: **Zaitsev's rule** — more substituted alkene preferred

### E1 (Unimolecular Elimination)
- Stepwise: carbocation forms first, then base deprotonates
- Rate = k[substrate]

---

## Competition Between SN and E

| Condition | Favors |
|-----------|--------|
| Strong nucleophile, 1° substrate | SN2 |
| Weak nucleophile, 3° substrate, heat | SN1/E1 |
| Strong bulky base, 2° or 3° substrate | E2 |
| Polar protic solvent, 3° substrate | SN1 |
| Polar aprotic solvent + strong Nu | SN2 |
""",
        },
    ],

    "PHY2049": [
        {
            "title": "Lecture 1: Electrostatics and Coulomb's Law",
            "content": """# Electrostatics and Coulomb's Law
**Date:** January 9 | **Lecture:** 1 of 30

---

## Electric Charge

- Two types: positive (+) and negative (−)
- Like charges repel; unlike charges attract
- **Charge is conserved** and **quantized** (q = ne, where e = 1.6 × 10⁻¹⁹ C)
- Conductors: charge flows freely; Insulators: charge stays fixed

---

## Coulomb's Law

```
F = k|q₁||q₂|/r²
```

- k = 8.99 × 10⁹ N·m²/C² = 1/(4πε₀)
- ε₀ = 8.85 × 10⁻¹² C²/(N·m²) — permittivity of free space
- Direction: along line connecting charges

**Superposition principle:** Net force = vector sum of all pairwise Coulomb forces

---

## Electric Field

```
E⃗ = F⃗/q₀  (field produced by a source charge)
E = kq/r²   (magnitude; direction: away from +, toward −)
```

**Field lines:**
- Start on positive, end on negative charges
- Density proportional to field strength
- Never cross

---

## Electric Flux and Gauss's Law

**Electric flux:**
```
Φ_E = E⃗ · A⃗ = EA cos θ
```

**Gauss's Law:**
```
Φ_E = Q_enc / ε₀
```

Applications (highly symmetric charge distributions):
- Spherical shell: E = kQ/r² outside, 0 inside
- Infinite line: E = λ/(2πε₀r)
- Infinite plane: E = σ/(2ε₀)

---

## Electric Potential

```
V = kq/r  (potential due to point charge)
ΔV = −∫ E⃗ · ds⃗
E = −dV/dx  (in 1D)
```

- Equipotential surfaces ⊥ field lines
- Potential energy: U = qV = kq₁q₂/r
""",
        },
        {
            "title": "Lecture 5: Circuits — Resistance and Capacitance",
            "content": """# Electric Circuits — Resistance and Capacitance
**Date:** February 3 | **Lecture:** 5 of 30

---

## Current and Resistance

**Current:** I = ΔQ/Δt (amperes = C/s)

**Ohm's Law:** V = IR  (for ohmic materials)

**Resistance:**
```
R = ρL/A
```
- ρ = resistivity (Ω·m, material property)
- L = length, A = cross-sectional area

**Power dissipated:**
```
P = IV = I²R = V²/R
```

---

## Series and Parallel Circuits

**Series resistors:**
```
R_eq = R₁ + R₂ + R₃ + …
Same current through all; voltages add
```

**Parallel resistors:**
```
1/R_eq = 1/R₁ + 1/R₂ + 1/R₃ + …
Same voltage across all; currents add
```

---

## Kirchhoff's Laws

**KCL (Junction rule):** Sum of currents into a junction = sum leaving (charge conservation)

**KVL (Loop rule):** Sum of voltage drops around any closed loop = 0 (energy conservation)

---

## Capacitance

A capacitor stores charge: Q = CV

**Capacitance of parallel plates:**
```
C = ε₀A/d
```

Energy stored:
```
U = Q²/(2C) = ½CV² = Q·V/2
```

**With dielectric (κ):** C = κε₀A/d (κ > 1 increases capacitance)

**Series capacitors:**
```
1/C_eq = 1/C₁ + 1/C₂ + …
```

**Parallel capacitors:**
```
C_eq = C₁ + C₂ + …
```

---

## RC Circuits

**Charging:** q(t) = C·V(1 − e^{−t/τ})

**Discharging:** q(t) = Q₀ e^{−t/τ}

**Time constant:** τ = RC

At t = τ: charge reaches ~63% of max (charging) or drops to ~37% (discharging).
""",
        },
        {
            "title": "Lecture 10: Magnetism and Faraday's Law",
            "content": """# Magnetism and Faraday's Law
**Date:** March 5 | **Lecture:** 10 of 30

---

## Magnetic Force on a Moving Charge

```
F⃗ = qv⃗ × B⃗
|F| = qvB sin θ
```

- Direction: right-hand rule (fingers point along v⃗, curl toward B⃗, thumb = F⃗ direction)
- Magnetic force does **no work** (⊥ to velocity)

---

## Magnetic Force on a Current-Carrying Wire

```
F⃗ = IL⃗ × B⃗
|F| = BIL sin θ
```

---

## Sources of Magnetic Fields

**Biot-Savart Law (general):**
```
dB⃗ = (μ₀/4π) · (I dL⃗ × r̂) / r²
```

**Ampere's Law (symmetric distributions):**
```
∮ B⃗ · dL⃗ = μ₀ I_enc
```

| Configuration | B field |
|--------------|---------|
| Long straight wire | B = μ₀I/(2πr) |
| Inside solenoid | B = μ₀nI (n = turns/length) |
| Inside toroid | B = μ₀NI/(2πr) |

---

## Faraday's Law of Induction

A changing magnetic flux induces an EMF:

```
ε = −dΦ_B/dt
Φ_B = ∫ B⃗ · dA⃗
```

**Lenz's Law:** The induced current opposes the change in flux (negative sign in Faraday's law).

---

## Motional EMF

A conducting rod of length L moving at velocity v in field B:
```
ε = BLv
```

---

## Maxwell's Equations (Summary)

| Equation | Physical Meaning |
|---------|-----------------|
| ∮ E⃗ · dA⃗ = Q_enc/ε₀ | Gauss's Law for E |
| ∮ B⃗ · dA⃗ = 0 | No magnetic monopoles |
| ∮ E⃗ · dL⃗ = −dΦ_B/dt | Faraday's Law |
| ∮ B⃗ · dL⃗ = μ₀I + μ₀ε₀ dΦ_E/dt | Ampere-Maxwell Law |
""",
        },
    ],

    "BCH3023": [
        {
            "title": "Lecture 1: Amino Acids and Protein Structure",
            "content": """# Amino Acids and Protein Structure
**Date:** January 10 | **Lecture:** 1 of 30

---

## Amino Acid Structure

All amino acids share:
- **α-carbon** bonded to: NH₂ group, COOH group, H, and R group (side chain)
- **Zwitterion** at physiological pH: −NH₃⁺ and −COO⁻

**20 standard amino acids** — differ only in R group.

---

## Classification of Amino Acids

| Category | Examples | R Group Property |
|----------|---------|-----------------|
| Nonpolar, aliphatic | Gly, Ala, Val, Leu, Ile | Hydrophobic |
| Aromatic | Phe, Tyr, Trp | Hydrophobic/aromatic |
| Polar, uncharged | Ser, Thr, Cys, Asn, Gln | Hydrogen bonding |
| Positively charged | Lys, Arg, His | Basic |
| Negatively charged | Asp, Glu | Acidic |

**Special cases:** Pro (cyclic -> disrupts α-helix); Cys (forms disulfide bonds); Gly (smallest, most flexible)

---

## Peptide Bond

Formed by **condensation** (dehydration synthesis) between −COOH and −NH₂:

- Planar (partial double bond character due to resonance)
- **Trans** configuration strongly preferred
- Not freely rotatable

---

## Levels of Protein Structure

**Primary (1°):** Amino acid sequence — determined by gene

**Secondary (2°):** Local regular structures
- **α-helix** — H-bonds between C=O of residue i and N-H of residue i+4; 3.6 residues/turn; R groups point outward
- **β-sheet** — H-bonds between extended strands; parallel or antiparallel

**Tertiary (3°):** Overall 3D fold of a single polypeptide; stabilized by:
- Hydrophobic interactions (major driving force)
- Disulfide bonds (Cys−Cys)
- Ionic interactions (salt bridges)
- H-bonds
- Van der Waals forces

**Quaternary (4°):** Association of multiple polypeptide subunits (e.g., hemoglobin: 4 subunits)
""",
        },
        {
            "title": "Lecture 5: Enzyme Kinetics",
            "content": """# Enzyme Kinetics
**Date:** February 3 | **Lecture:** 5 of 30

---

## Enzymes as Biological Catalysts

- Lower activation energy (Eₐ) without being consumed
- Highly specific (structural and stereospecific)
- **Active site** — cleft where substrate binds
- **Lock-and-key model** vs. **Induced fit model** (more accurate; enzyme changes shape upon substrate binding)

---

## Michaelis-Menten Kinetics

For: E + S ⇌ ES -> E + P

```
v = V_max [S] / (K_M + [S])
```

- **V_max** = maximum reaction velocity (when all enzyme is saturated)
- **K_M** (Michaelis constant) = [S] at which v = ½V_max
  - Low K_M -> high affinity for substrate
- **k_cat** = turnover number = V_max / [E_total]

---

## Lineweaver-Burk Plot (Double Reciprocal)

```
1/v = (K_M/V_max)(1/[S]) + 1/V_max
```

- y-intercept = 1/V_max
- x-intercept = −1/K_M
- Slope = K_M/V_max

---

## Types of Enzyme Inhibition

| Type | K_M | V_max | Mechanism |
|------|-----|-------|-----------|
| Competitive | Increases | Unchanged | Inhibitor binds active site; overcome by ↑[S] |
| Uncompetitive | Decreases | Decreases | Inhibitor binds ES complex only |
| Noncompetitive | Unchanged | Decreases | Inhibitor binds E or ES; can't overcome with ↑[S] |
| Mixed | Changes | Decreases | Inhibitor binds E and ES with different affinities |

---

## Enzyme Regulation

- **Allosteric regulation** — effector binds site other than active site -> conformational change
- **Covalent modification** — phosphorylation (kinases), dephosphorylation (phosphatases)
- **Feedback inhibition** — end product inhibits early enzyme in a pathway
- **Zymogen activation** — inactive precursor cleaved to active enzyme (e.g., trypsinogen -> trypsin)
""",
        },
        {
            "title": "Lecture 9: Metabolism — Glycolysis and TCA Cycle",
            "content": """# Metabolism — Glycolysis and the TCA Cycle
**Date:** February 26 | **Lecture:** 9 of 30

---

## Overview of Metabolism

**Catabolism** — breaks down molecules; releases energy (ATP)
**Anabolism** — builds molecules; requires energy input

**Central metabolic hub:** Pyruvate and Acetyl-CoA connect carbohydrate, lipid, and protein metabolism

---

## Glycolysis (Cytoplasm)

Converts 1 glucose (6C) -> 2 pyruvate (3C)

**Phases:**
1. **Energy investment** (reactions 1–5): consumes 2 ATP
2. **Energy payoff** (reactions 6–10): produces 4 ATP + 2 NADH

**Net per glucose:** 2 ATP, 2 NADH, 2 pyruvate

**Key regulated enzymes:**
- Hexokinase (step 1)
- Phosphofructokinase-1 (PFK-1) — rate-limiting step; inhibited by ATP/citrate, activated by AMP/ADP
- Pyruvate kinase (step 10)

---

## Pyruvate Dehydrogenase Complex

**Location:** Mitochondrial matrix
**Reaction:** Pyruvate + CoA + NAD⁺ -> Acetyl-CoA + CO₂ + NADH

Requires: TPP, FAD, NAD⁺, CoA, lipoate (5 cofactors)

Regulated: inhibited by Acetyl-CoA, NADH, ATP; activated by CoA, NAD⁺, AMP

---

## TCA Cycle (Krebs Cycle) — Mitochondrial Matrix

Acetyl-CoA (2C) enters -> condenses with oxaloacetate (4C) -> citrate (6C) -> …

**Per turn:**
- 2 CO₂ released
- 3 NADH produced
- 1 FADH₂ produced
- 1 GTP (= ATP) produced

**Per glucose (2 turns):** 6 NADH, 2 FADH₂, 2 GTP, 4 CO₂

---

## NADH/FADH₂ -> ATP (ETC)

- Each NADH -> ~2.5 ATP
- Each FADH₂ -> ~1.5 ATP

**Total ATP yield per glucose (aerobic):**
- Glycolysis: 2 ATP + 2 NADH (5 ATP)
- PDH: 2 NADH (5 ATP)
- TCA: 2 GTP + 6 NADH + 2 FADH₂ (2 + 15 + 3 = 20 ATP)
- **Grand total: ~30–32 ATP**
""",
        },
    ],
}

# ---------------------------------------------------------------------------
# Connection definitions  (from_key, to_key, link_type)
# ---------------------------------------------------------------------------

CONNECTIONS = [
    # Prerequisites
    ("BSC2010", "BSC2011", "prerequisite"),
    ("CHM2045", "CHM2046", "prerequisite"),
    ("MAC2311", "MAC2312", "prerequisite"),
    ("MAC2311", "PHY2048", "prerequisite"),
    ("PHY2048", "PHY2049", "prerequisite"),
    ("BSC2011", "BCH3023", "prerequisite"),
    ("CHM2046", "BCH3023", "prerequisite"),
    ("CHM2046", "CHM3210", "prerequisite"),
    ("BSC2010", "PCB3063", "prerequisite"),
    # Related-to (bidirectional — one edge; app shows inbound + outbound)
    ("BSC2010", "CHM2045", "related-to"),
    ("PHY2048", "MAC2311", "related-to"),
    ("PHY2048", "MAC2312", "related-to"),
    ("CHM3210", "BCH3023", "related-to"),
    ("PCB3063", "BCH3023", "related-to"),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _headers(token: str | None) -> dict:
    return {"Authorization": f"Bearer {token}"} if token else {}


def post(url: str, payload: dict, token: str | None = None) -> dict:
    resp = requests.post(url, json=payload, headers=_headers(token), timeout=30)
    if not resp.ok:
        print(f"  ERROR {resp.status_code}: {resp.text[:300]}")
        resp.raise_for_status()
    return resp.json()


def delete(url: str, token: str) -> None:
    resp = requests.delete(url, headers=_headers(token), timeout=30)
    if not resp.ok:
        print(f"  ERROR {resp.status_code}: {resp.text[:300]}")
        resp.raise_for_status()


def get(url: str, token: str) -> dict | list:
    resp = requests.get(url, headers=_headers(token), timeout=30)
    resp.raise_for_status()
    return resp.json()


def step(msg: str):
    print(f"\n{'='*60}\n  {msg}\n{'='*60}")


# ---------------------------------------------------------------------------
# Main seed routine
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Seed the pre-med curriculum for a NoteBud account.")
    parser.add_argument("--username",     default="RoaryPanther", help="Account username (default: RoaryPanther)")
    parser.add_argument("--password",     default="panther1234",  help="Account password  (default: panther1234)")
    parser.add_argument("--base-url",     default=os.getenv("BASE_URL", "http://localhost:8000"),
                                          dest="base_url",        help="API root URL      (default: http://localhost:8000)")
    parser.add_argument("--skip-banners", action="store_true",    help="Skip Unsplash banner uploads")
    args = parser.parse_args()

    username  = args.username
    password  = args.password
    api       = f"{args.base_url.rstrip('/')}/api/v1"

    # ── 1. Register ────────────────────────────────────────────────────────
    step(f"Registering user '{username}'")
    try:
        user = post(f"{api}/auth/register", {"username": username, "password": password})
        print(f"  Created user: {user}")
    except requests.HTTPError as e:
        if e.response.status_code == 409:
            print(f"  User '{username}' already exists — continuing.")
        else:
            raise

    # ── 2. Login ───────────────────────────────────────────────────────────
    step("Logging in")
    token_data = post(f"{api}/auth/token", {"username": username, "password": password})
    token = token_data["access_token"]
    print(f"  Token obtained (first 40 chars): {token[:40]}...")

    # ── 3. Delete existing notebooks (idempotent reset) ────────────────────
    step("Deleting existing notebooks for this user")
    existing = get(f"{api}/notebooks", token)
    if existing:
        for nb in existing:
            delete(f"{api}/notebooks/{nb['id']}", token)
            print(f"  Deleted: [{nb.get('course_code','?')}] {nb['title']} ({nb['id']})")
    else:
        print("  No existing notebooks found.")

    # ── 4. Create notebooks ────────────────────────────────────────────────
    step("Creating notebooks")
    notebook_ids: dict[str, str] = {}  # key -> id

    for nb in NOTEBOOKS:
        key = nb["key"]
        payload = {
            "title": nb["title"],
            "course_code": nb["course_code"],
            "description": nb["description"],
            "semester": nb["semester"],
        }
        result = post(f"{api}/notebooks", payload, token)
        nb_id = result["id"]
        notebook_ids[key] = nb_id
        print(f"  [{key}] '{nb['title']}' -> {nb_id}")

    # ── 5. Create notepages (markdown converted to HTML for TipTap) ────────
    step("Creating notepages")
    for key, notes in NOTES.items():
        nb_id = notebook_ids[key]
        for note in notes:
            result = post(
                f"{api}/notebooks/{nb_id}/notes",
                {"title": note["title"], "content": md_to_html(note["content"])},
                token,
            )
            print(f"  [{key}] '{note['title']}' -> {result['id']}")

    # ── 6. Create connections ──────────────────────────────────────────────
    step("Creating notebook connections")
    for from_key, to_key, link_type in CONNECTIONS:
        from_id = notebook_ids[from_key]
        to_id = notebook_ids[to_key]
        try:
            result = post(
                f"{api}/notebooks/{from_id}/links",
                {"to_notebook_id": to_id, "link_type": link_type},
                token,
            )
            print(f"  {from_key} --[{link_type}]--> {to_key}  (link id: {result.get('id','?')})")
        except requests.HTTPError:
            print(f"  SKIPPED: {from_key} --[{link_type}]--> {to_key} (may already exist)")

    # ── 7. Upload banners ──────────────────────────────────────────────────
    if args.skip_banners:
        step("Skipping banner uploads (--skip-banners)")
    else:
        step("Uploading notebook banners from Unsplash")
        for key, nb_id in notebook_ids.items():
            pid = BANNERS.get(key)
            if not pid:
                print(f"  SKIP {key} — no banner defined")
                continue
            img_url = _BANNER_CDN.format(id=pid)
            img_r = requests.get(img_url, timeout=20)
            if img_r.status_code != 200:
                print(f"  FAIL download {key}: HTTP {img_r.status_code}")
                continue
            files = {"file": (f"{key}_banner.jpg", io.BytesIO(img_r.content), "image/jpeg")}
            up = requests.post(
                f"{api}/notebooks/{nb_id}/banner",
                headers=_headers(token),
                files=files,
                timeout=30,
            )
            if up.status_code == 200:
                print(f"  OK   {key} ({len(img_r.content) // 1024}KB)")
            else:
                print(f"  FAIL {key}: {up.status_code} {up.text[:80]}")

    # ── 8. Done ────────────────────────────────────────────────────────────
    step("Done!")
    print(f"  User:      {username}")
    print(f"  Password:  {password}")
    print(f"  Notebooks: {len(notebook_ids)}")
    total_notes = sum(len(v) for v in NOTES.values())
    print(f"  Notepages: {total_notes}")
    print(f"  Links:     {len(CONNECTIONS)}")
    print()
    print("  Notebook IDs:")
    for key, nb_id in notebook_ids.items():
        print(f"    {key}: {nb_id}")


if __name__ == "__main__":
    main()
