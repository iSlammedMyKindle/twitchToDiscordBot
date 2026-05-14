# AI Policy

Large Language Models, or **LLMs** for short, allow for the creation of new code through prompting, scaffolding, and guardrails enforced by the user that requested it. Models create new output based on their training data, and weights (aka, the relevancy and importance of possible responses).

This codebase *does permit* the usage of models in a very specific manner, and with selective models. This file will also go over:

* The logistics & what AI entails legally
* What models are allowed
* This project's stance
* How humans will apply models in the work

---

This document will be hand-written by `iSlammedMyKindle` and will be inserted into each project using language models to assist in building infrastructure. If this document is used outside Kindle's repositories, you're more than welcome to personalize it to the required needs.

If there is more than one contributor to this file after it's authored, place your username under the [Author's Section](#authors) .

Strict language in this doc will make use of **RFC 2119**, as defined here: https://www.rfc-editor.org/rfc/rfc2119

# Logistics

In the United States, [Machine-generated code is in the public-domain](https://www.copyright.gov/ai/) . Here are a few distinctions to make:

* Fully-generated code from LLMs (without any hand-written attributes), is public domain
* Work created from a human, then *transformed* by an LLM, is partially copyrightable. (only the parts you can distinctly say was made by a human)
* Scaffolding & guardrails ( a corpus of documentation explicitly designed to create more consistent generated output ), is copyrightable
* If models generate more scaffolding & guardrails, those parts are in the public domain

In other words, human output (scaffolding, original code) has rights in the United States, *generated code does not.*

## Why does this matter when the project is free & open source?

This code is licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/) . This means:

* You MAY use the project and code
* As long as the original author is credited (MUST)

Given this project be used commercially, When AI is not a legal author, Then it can't be claimed as your own work. The commercial use distinction here lies around how the code is used instead. It's possible to sell it, but the value instead may come out of:

* The surrounding community and knowledge wealth of the codebase
* Having people maintain bugs or issues that may arise
* The creative use of combining this software with other software & infrastructure
* Using the product as a service
* Being a hosting platform

---

As for open source projects, users, or organizations using the code, the primary concern will be around licensing. LLMs have their own licensing terms for using the models themselves, which will be covered in the next section

# Permissible Model Families

Model families will be ordered by preference based on transparency & disclosure. It's non-exhaustive and represents an example of what the codebase will permit.

If a desired model / family of models isn't present on this list, a request SHALL be made to add it via PR

* **Nemotron (e.g 3 super)** - NVIDIA Open Model License  - NVIDIA
* **GLM (e.g 5.1)** - MIT - z.ai
* **Kimi (e.g 2)** - MIT - Moonshot
* **Mistral (nemo, medium, large)** - Apache 2

## Guidelines for adding new models

Models MUST:

* have a permissive license (MIT, Apache 2, BSD, etc)
* Possess open weights

This means OpenAI Models, or Anthropic models, mostly fall out of this category, with the exception of GPT-OSS. Check the licensing of your desired model before proposing a PR.

Exceptions:

* Output of model is incredibly small & does not hit a [threshold of originality](https://en.wikipedia.org/wiki/Threshold_of_originality)

Models MAY:

* have open training data

This is a plus, but almost no model has this (as of this writing). Nemotron is currently the exclusive example in this doc.


# Image Generating Stable Diffusion Models

Models that have the capacity to create imagery have strong restrictions in this codebase. In order for one of these to be used, the model MUST have all the following:

* Posess an open training data-set
* Demonstrate that all images for training was permitted to be trained on
* Have a permissable license (Apache 2, MIT, BSD, etc)

With the following exception:

* Proprietary models with full ownership of the image dataset (not scraped), MAY be considered, given that licensing permits.

There are several models which do not disclose their training and therefore propose risk of copyright infringement. These include OpenAI's DALL-E, Google's Imagen & Nano Banana, and Midjourney. Developers SHALL NOT make use of these models in any portion of the codebase.

If an image diffusion model is desired for usage, a proposal MUST be created through a PR process, mending this document to feature the desired model as part of a list.

## List of Permissible Diffiusion Models

<None at this time>

# This Project's Stance

The intent for AI usage in this project is to be used for tooling, with complete and comprehensive understanding of how the codebase works.

The core reasoning behind this project specifically is to learn; to which learning can be done through many facets. The significance of using a model also amplifies human talent, when done right. This does *not* mean that people put in a single one-liner and have a model un-wieldingly create something a person can barely understand before tossing it into a Pull Request.

As such, when having big refactors and big sweeping changes, it must, and will, be done with care. Last second changes with little to no thought won't be accepted into the codebase.

---

The overall intent is that:

* AI, more specifically LLMs, are used as *a tool* for writing. Not the definition of the entire codebase.
* Changes will be comprehended, tested, and vetted by at least 1-2 humans
* Authors know *exactly* what they are changing, and can describe what it's doing fluently
* Models used will be ethical (in other words: permissible license, open weight, and optionally open training data)

# Rules of Human interaction with AI

This section explains how developers will utilize models, and provide full transparency of the process, as well as how to go about performing a Pull Request:

* Every new code change MUST be comprehended and understood.
* Every new code changes MUST be tested at some capacity, this may include:
	* Manual testing (MUST)
	* Unit testing (SHOULD) (Depends on codebase)
	* E2E (SHOULD) (Depends on codebase)
	* Component (SHOULD) (Depends on codebase)
* Every commit with generated code MUST contain a preface holding the name of the model
	* e.g "[nemotron] refactored acme.ts to include a new endpoint"
* Every PR MUST be reviewed *and approved* by a human being, and MUST NOT be merged automatically
* Every developer MUST be held accountable for their actions, including generated code.

Every aspect of the code MUST contain a human trust level, as mentioned in each bullet point in the above list. If this is not respected, developers propose risk of having no further interaction directly with the codebase, as determined case-by-case.

# Authors

- iSlammedMyKindle ( original author )
