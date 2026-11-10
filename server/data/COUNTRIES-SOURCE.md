# Country and territory reference

Retrieved 2026-11-10 from https://github.com/mledoze/countries
(https://raw.githubusercontent.com/mledoze/countries/master/countries.json).
Source data is licensed under the ODC Open Database License (ODbL) 1.0:
https://opendatacommons.org/licenses/odbl/1-0/ .
See COUNTRIES-LICENSE.txt for the source license text. Derived country names
and alias data in country.json and country-reference.generated.ts are made
available under the same ODbL terms; application code is separate.

The reference contains 250 country/territory entries, including dependent
territories and Kosovo, plus five historical film production entries:
Soviet Union, Czechoslovakia, Yugoslavia, East Germany and West Germany.
It is a movie production lookup, not a statement about sovereign recognition.

Generated with scripts/update-country-reference.mjs. Original/common/official
names and codes come from the source. Uzbek/Russian/English display aliases
also use Node Intl.DisplayNames (Unicode CLDR). Existing India and USA labels
are preserved. Ambiguous short names Korea and Congo are not auto-resolved.

Country additions are explicit maintenance: npm run countries:sync previews;
npm run countries:sync -- --apply adds missing entries without renaming or
deleting existing DB rows. Never run the full movie seed for this operation.
