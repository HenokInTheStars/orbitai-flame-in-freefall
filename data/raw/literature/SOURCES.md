# Tables transcribed from peer-reviewed papers

## `link2018_pmma_rod_flame_spread.csv`: flame spread rate vs O2, microgravity and Earth (98 rows)

**Source:** Link, S., Huang, X., Fernandez-Pello, C., Olson, S. & Ferkul, P. (2018). *The Effect of Gravity on Flame Spread over PMMA Cylinders.* Scientific Reports 8:120. https://doi.org/10.1038/s41598-017-18398-4. Licence: **CC BY 4.0**, so it can be reused with credit.

- Table S1 (52 rows): ISS microgravity data from BASS-II, black (B) and clear (C) PMMA rods. Table S2 (46 rows): normal-gravity data from the authors' ground tests, each value the average of at least 3 tests.
- Taken from the Supplementary Information PDF: https://static-content.springer.com/esm/art%3A10.1038%2Fs41598-017-18398-4/MediaObjects/41598_2017_18398_MOESM1_ESM.pdf
- `vf_x1e3_cm_s_as_printed` is the flame spread rate as printed (Vf × 10³ in cm/s). To get mm/s, multiply by **0.01**. Example: 5.23 → 0.0523 mm/s.
- The right half of Table S1 labels this column "(mm/s)" while the left half says "(cm/s)". The values are the same size and match the paper's Fig. 5, which uses Vf × 10³ cm/s, so both halves are treated as cm/s.
- In S2, a printed `-` means there was no steady flame spread at that condition (`flame_spread = no`).
- The paper gives O2 uncertainty in microgravity as **±0.3%** (Fig. 7 caption). It also says the microgravity points "were not systematically taken" (p. 4).

**How the transcription was checked:** the table layout was rebuilt from the text positions in the PDF. Every number in the PDF appears in the CSV. The paper's sample IDs match the BASS-II PSI-25 table's Fernandez-Pello rod tests (sample Xn ↔ test Pn). For 18 of 19 samples, rod diameter and initial O2 agree with PSI-25. **B15 is the exception:** the paper says 18.4% O2 and PSI-25 P15 says 18.0% initial (17.5% final).

**Key results (paper text, p. 1 and p. 6):** in microgravity, flames spread on PMMA rods at **17% O2** (data down to 16.8%), while on Earth there was no flame spread at **18% and below** for the rods tested in both conditions. Below about 19% O2, flames spread *faster* in microgravity than on Earth. At 21% they spread faster on Earth. Exception, Earth-only data: the thin 0.32 cm rod still spread at 17.5% on Earth (Table S2).
