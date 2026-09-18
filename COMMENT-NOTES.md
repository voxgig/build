# Implementation rationale

Documentation generation is a pure function of the compiled model. Generated pages and service READMEs are regenerated and content-diffed, so their source is the model and generator rather than hand edits to the output.

Message declarations can be nested pattern chains or flat definitions. Use the message-entry adapter: recursively walking a flat definition treats metadata fields as messages.

Sources: [documentation generator](doc/doc_gen.ts), [Lambda resource generator](env/lambda/res_yml.ts).
