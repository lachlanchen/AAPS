# SMA Organoid AAPS Original Prompt Trace (Redacted)

This file preserves the recent user prompt sequence that shaped the SMA
organoid-grid AAPS case study. It is intentionally redacted for public use:
local absolute paths, private project names that are not needed for the method,
and secrets/tokens are replaced with placeholders. Typos and conversational
style are mostly preserved because they are part of the natural-language
programming interface AAPS is meant to support.

Scope: this file captures the recent SMA organoid segmentation, report,
AgInTi-refinement, AAPS-session, and runtime-resume prompt sequence. Broader
earlier AAPS/AgInTiFlow/Studio directives are archived in
`references/AAPS-dev-prompt-v3.md`,
`references/efficient-prompts/aaps-studio-recent-tdv-prompt-notes-2026-05-07.md`,
and `references/codex-session-cross-references.md`.

## Redaction Legend

- `<SMA_PROJECT>`: the SMA project directory.
- `<AAPS_REPO>`: the AAPS source checkout.
- `<INPUT_IMAGE>`: the organoid grid image.
- `<PUBLICATION_DIR>`: the publication/report output directory.
- `<REFERENCE_REPO>`: nearby reference code or analysis repositories.

## Prompt 1: Use AAPS To Segment The Organoid Grid

> now i have a task [Image #1] `<INPUT_IMAGE>`
>
> i want to segment this but i want to use aaps. so you use aaps command or
> webapp to finish the task.
>
> so task can only be finished by the apps not by yourself.
>
> so final output should be an aaps. and you also update aaps if it cannot
> finish the task?
>
> i want to try cellpose, thresholding, multiscale cellpose, and image gen of
> aginti.
>
> first each output a result. then write an aaps with agent use codex 5.5
> medium exec non-interactive in the aaps. the agent first sample several images
> and find the rough size in pixel of the single organoid, use cellpose as
> default, and use an agent check the result. if not good then make a decision
> using thresholding or multiscale cellpose or image gen of aginti.
>
> first the aaps split the image and then do the for loop of each image after
> the split into single.
>
> the aaps should work and you only allow finish the task within the aaps and
> write aaps in the SMA folder and also output in that folder.

## Prompt 2: Add TeX/PDF Report And Fix Cellpose

> thank you. could you let aaps write a TEX in `<PUBLICATION_DIR>` for the full
> result to summarize the run with figures and everything. AAPS has this as
> default that it can use codex 5.5 high or xhigh to finish this. this is an
> agent block.
>
> i wish you fix cellpose and use it. you can check reference repos to make sure
> cellpose works, even tho later its AAPS own responsibility to fix the tools.
>
> for AAPS itself does it have inherent version control of its own code and
> compiled code and scripts. plz implement that to avoid change too much.
>
> can the webapp parse the aaps?
>
> make cellpose work and also aginti work and output each individual organoids
> in each subfigure in the grid of images.
>
> write the second .aaps that it do the segmentation with cellpose by default,
> then check the result with agent codex exec 5.5 medium. if the result not good
> then use aginti image gen. make aaps record all logs decisions and
> intermediate things for debug.

## Prompt 3: Keep Working Through AAPS, Not Around It

> keep working
>
> btw do you use dev version or global installed version aaps? plz remember
> publish and global install if you use global installed aaps nor dev aaps.
>
> for the aaps working, you can chat with aaps multiple times if its outputs not
> meet our needs and aaps has chat like just codex or aginti. you can send
> prompt to it multiple times in a same session.
>
> could you btw document all my prompts i said in last several questions today.
> this is actual a classic example i wish aaps can finish and also how i expect
> aaps work.

## Prompt 4: Parser-First And Git-Versioned

> AAPS must first generate the .aaps but not stupidly work on the things
> directly. the point here is use aaps to manage and harness the task. and the
> actual scripts can be generated via compile the aaps.
>
> for the version control do you use git. i wish you use git to be inherently
> working in the aaps for the code changed during chat for either workflow or
> the manifested scripts or code. so for each chat that it should commit.
>
> the aaps must follow grammar and parsable by the webapp. and you can chat in
> webapp or cli both are the same for a single same session.
>
> in the future try to fix inside aaps that ask using cellpose with GPU and aaps
> should fix this problem by itself. so the gpu requirements should exist in the
> aaps and aaps should have a feature to specify this.

## Prompt 5: Parser Diagnostics Must Feed Back To Agent

> keep working
>
> and for the parse, aaps should have a dedicated parser and .aaps must pass the
> parser. and you can help me improve the parser if it doesn't meet our needs.
>
> and also doc this msg itself as last msg into the references in AAPS this
> repo.

## Prompt 6: Compiler Should Be Smart But General

> keep working but not too overpatch.
>
> our 'compiler' should work robust and generally.
>
> so it should be the codex exec xhigh to be smart and we assume codex 5.5 xhigh
> can finish this.
>
> you can hardcode some but plz be careful.
>
> you should optimize the prompt in aaps chat and also the system prompt that
> come with the msg.

## Prompt 7: Use AgInTi If Output Is Not Good

> it's very good you fix aaps. thanks
>
> plz don't forget that supervising AAPS to finish the task alone by itself.
>
> you chat with AAPS and it write the aaps and compile it and run it and fix
> itself during running.
>
> it should use aginti if the output not good so this is an agent call like call
> codex or aginti.
>
> for the report and visualization i wish it use the overlay with color of each
> instance rather than just edge.
>
> for the git version control AAPS itself should have this feature, not just the
> workflow itself, and it should version control the project.

## Prompt 8: Default Block Guidance

> could you add some default guidance for the block design in AAPS itself?
>
> so the block and aaps shouldn't go completely freedom but has some guidance:
> respect the grammar, prompt redundancy and context info, default blocks like
> for/if-else, agent block, code block, script block or report block.
>
> custom blocks are allowed, but it has guide and grammar and some general block
> design skill/guidance.

## Prompt 9: Complete Recap Report

> for the report it's a complete recap of the whole task with the input and
> intermediate decision and final outputs.
>
> it should use all the logs and results outputed in the middle to form a final
> report.
>
> show the input and segment of different methods and the decisions, especially
> that used aginti for refinement.
>
> codex image view should detect quality and use aginti image gen properly to
> generate a better one and incorporate that into the output.
>
> agent calls should pass detailed QC information to the next agent and produce
> a consistent output structure.

## Prompt 10: Mature Report Paradigm And Slow Manifestation

> AAPS side should have a mature report paradigm and also chat it to understand
> this.
>
> report block should have good prompt as an agent and prefer use codex 5.5
> xhigh.
>
> for write and compile of aaps, you can use manifest as new word for compile.
>
> when manifest the aaps, it can compile slower block by block with a reused
> codex session, one by one compile with xhigh or high quality manifestation.

## Prompt 11: Smooth Agent Handover

> make the smooth handover between adjacent agent blocks like codex have image
> view mode so it can read image and pass the conclusion and everything if
> regenerate with aginti image gen method.
>
> the generated results should incorporate into the main pipeline.
>
> for parse, error should feedback to agent and agent should only finish until
> it finished the parsing via the parser.

## Prompt 12: Website/README And Manifest Term

> plz make sure you supervised aaps finished the task and used aginti image gen
> for some refinement of bad outputs.
>
> give a very detailed report by aaps itself at the end of the loop after finish
> the loop.
>
> update the readme and website of everything and also website change compile to
> manifest (you can put compile in parentheses).

## Prompt 13: Result Almost Good, Need AgInTi Fix

> the result is almost good. thank you
>
> but i wish you use aginti image gen to fix some as requested before.

## Prompt 14: Codex Image View Must Identify Problems And Retry

> the codex image view should identify the problem like not recognize all
> organoids and then handover to aginti image gen to generate the better one.
>
> the result should also be checked by codex agent 5.5 high or other reasoning
> level. if the output reasonable, accept it. if not, pass back to aginti image
> gen prompts and regenerate again until the final results is separable like
> other annotation of instance segmentation.

## Prompt 15: Use Same AAPS Session But Finish First

> for aaps plz use resume the same aaps session.
>
> it has similar session logic design as aginti.
>
> but first finish the task and later consider the session id kind of thing.

## Prompt 16: Prompt Archive And Runtime Resume

> could you document all my last dozens msgs into the references i asked you
> write before?
>
> and also save my original msgs.
>
> and check if there is anything missing like the session management of aaps.
>
> and btw resume of the aaps workflow task in the middle and stop in the middle
> and rerun at different level full rerun and rerun in current run and no
> override and skip these already finished, like split the first tiles, or also
> like skip the cellpose step and just check with image view and ask aginti image
> gen if low quality.

## Derived Requirements

- AAPS needs both chat-session continuity and runtime-run continuity.
- Chat sessions are already expected to sync between CLI and Studio.
- Runtime resume must preserve prior run records and skip completed evidence
  without overwriting artifacts unless explicitly requested.
- `run-block`, `--from-step`, `--resume-run`, and `--skip-completed` cover the
  practical rerun levels needed by the SMA case.
- Future AAPS should add richer paused human-review state, artifact freshness
  checks for skipped blocks, and UI controls for resume/no-override policies.
