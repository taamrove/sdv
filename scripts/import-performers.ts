/**
 * One-off script to import performers from the Show de vida member list.
 * Each performer gets a linked Contact record (Contact Hub architecture).
 * Run with: npx tsx scripts/import-performers.ts
 */
import { PrismaClient, PerformerType } from "@prisma/client";

const prisma = new PrismaClient();

interface PerformerData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  type: PerformerType;
  notes?: string; // stored on Performer, not Contact
}

const performers: PerformerData[] = [
  // ──────────────────────────────────────────────────────────────
  // DANCERS
  // ──────────────────────────────────────────────────────────────
  { firstName: "Ada Marthine",            lastName: "Marthinsen",        phone: "+47 93021341",  email: "adamarthinsen@yahoo.no",              type: "DANCER" },
  { firstName: "Albin",                   lastName: "Linden",            phone: "+46 762099478", email: "linden.albin@gmail.com",              type: "DANCER" },
  { firstName: "Alice",                   lastName: "Quan",              phone: "+47 90788955",  email: "alicequan-@hotmail.com",              type: "DANCER" }, // email from source
  { firstName: "Aliochy Cabodevilla",     lastName: "Aragón",            phone: "+47 98431131",  email: "el-iyabo@hotmail.no",                 type: "DANCER" },
  { firstName: "Anette Bjerke",           lastName: "Klophus",           phone: "+47 99543473",  email: "anette@marloustylingbar.no",          type: "DANCER", notes: "Makeup" },
  { firstName: "Anette",                  lastName: "Solvang",           phone: "+47 93260372",  email: "anetts99@hotmail.com",                type: "DANCER" },
  { firstName: "Anette",                  lastName: "Stokke",                                    email: "anettestokkedans@gmail.com",           type: "DANCER" },
  { firstName: "Apolonia",               lastName: "Knach",             phone: "+47 97729787",  email: "apolonia.knach@gmail.com",            type: "DANCER" },
  { firstName: "Audun",                   lastName: "Kvam",              phone: "+47 92257674",  email: "kvaudun@gmail.com",                   type: "DANCER" },
  { firstName: "Aurora",                  lastName: "Itland",            phone: "+47 91352211",  email: "aurora.itland@gmail.com",             type: "DANCER" },
  { firstName: "Benjamin Windborg",       lastName: "Larsen",            phone: "+47 41321539",  email: "benjamin.windborg@gmail.com",         type: "DANCER" },
  { firstName: "Ben",                     lastName: "Nguyen",            phone: "+47 48184395",  email: "ben.nguyen01@hotmail.com",            type: "DANCER" },
  { firstName: "Brenda Santos",          lastName: "Olsvik",            phone: "+47 90225833",  email: "brendasantosolsvik@gmail.com",        type: "DANCER" },
  { firstName: "Carina Sogn",            lastName: "Stave",             phone: "+47 46940826",  email: "carinasstave@gmail.com",              type: "DANCER" },
  { firstName: "Carla Del",              lastName: "Giudice",                                    email: "carladelgiudi@gmail.com",              type: "DANCER" },
  { firstName: "Carl",                    lastName: "Peters",            phone: "+46 734301692", email: "carl.peters@hotmail.se",              type: "DANCER" },
  { firstName: "Celina Fløisand",        lastName: "Moen",              phone: "+47 45452106",  email: "contact@celinamoen.com",              type: "DANCER" },
  { firstName: "Charlotte",              lastName: "Steckmest",         phone: "+47 48242923",  email: "charlottesteckmest@gmail.com",        type: "DANCER" },
  { firstName: "Christiane",             lastName: "Bergersen",         phone: "+47 95063906",  email: "christiane.bergersen@outlook.com",    type: "DANCER" },
  { firstName: "Christian Smith",        lastName: "Johnsen",           phone: "+47 91554108",  email: "christiansmithj@gmail.com",           type: "DANCER" },
  { firstName: "Cristián Sandoval",      lastName: "Ronnby",            phone: "+47 91852419",  email: "cristianronnby@icloud.com",           type: "DANCER" },
  { firstName: "Daniela",                lastName: "Cabrera",           phone: "+47 93026954",  email: "dacabrera99@yahoo.com",               type: "DANCER" },
  { firstName: "Daniel Enrique Arango",  lastName: "Carmona",           phone: "+34 611187215", email: "enrique_9605@hotmail.com",            type: "DANCER" },
  { firstName: "Daniel",                 lastName: "Grindeland",        phone: "+47 41679006",  email: "grindelandentertainment@gmail.com",   type: "DANCER" },
  { firstName: "Daniel",                 lastName: "Sarr",                                      email: "daniel_sarr@hotmail.com",             type: "DANCER" },
  { firstName: "Denice Miriam",          lastName: "Solberg",                                   email: "denicemiriam@hotmail.com",            type: "DANCER" },
  { firstName: "Edin",                   lastName: "Jusuframic",        phone: "+46 736598144", email: "info@edinj.se",                       type: "DANCER" },
  { firstName: "Elise Berg",            lastName: "Hansen",            phone: "+47 92411895",  email: "elisebh@hotmail.com",                 type: "DANCER" },
  { firstName: "Ella",                   lastName: "Skorgan",           phone: "+47 41234686",  email: "e.skorgan@gmail.com",                 type: "DANCER" },
  { firstName: "Embla",                  lastName: "Bergerud",          phone: "+47 99404983",  email: "embla.sb@gmail.com",                  type: "DANCER" },
  { firstName: "Fanny Geiwald",          lastName: "Gauperaa",          phone: "+47 47287338",  email: "fanny_gauperaa@hotmail.com",          type: "DANCER" },
  { firstName: "Fransiska",              lastName: "Sveinall",                                  email: "fransiska1@hotmail.com",              type: "DANCER" },
  { firstName: "Frida Berg",            lastName: "Aas",               phone: "+47 41320844",  email: "frida_bergaas@hotmail.com",           type: "DANCER" },
  { firstName: "Frida Vågan",           lastName: "Pettersen",         phone: "+47 97138770",  email: "fridavaaganpettersen@gmail.com",      type: "DANCER" },
  { firstName: "Gamar Addel Santos De la", lastName: "Torres",                                  email: "adel_santosd@hotmail.es",             type: "DANCER" },
  { firstName: "Guro Elde",             lastName: "Paulsen",           phone: "+47 48033282",  email: "guroeldepaulsen@hotmail.com",         type: "DANCER", notes: "Magedanser (belly dancer)" },
  { firstName: "Helge",                  lastName: "Freiberg",                                  email: "helgf@yahoo.com",                     type: "DANCER" },
  { firstName: "Ida Juel",              lastName: "Hansen",            phone: "+45 20667934",  email: "idajhansen@hotmail.com",              type: "DANCER" },
  { firstName: "Idunn",                  lastName: "Hillesøy",                                  email: "idunn.ballett@gmail.com",             type: "DANCER" },
  { firstName: "Iris Reder",            lastName: "Kristoffersen",                              email: "irisreder@hotmail.com",               type: "DANCER" },
  { firstName: "Iselin",                 lastName: "Kvernevik",         phone: "+47 47253582",  email: "iselinkv@hotmail.com",                type: "DANCER" },
  { firstName: "Iselin Natalie Garcia", lastName: "Fredriksen",                                email: "iselin.ngf@gmail.com",                type: "DANCER", notes: "Makeup" },
  { firstName: "Iselin",                 lastName: "Nybak",             phone: "+47 94238651",  email: "iselinnybak@hotmail.com",             type: "DANCER" },
  { firstName: "Jeffrey",                lastName: "Young",             phone: "+47 40962319",  email: "mryoungjfy211@gmail.com",             type: "DANCER" },
  { firstName: "Josefine",               lastName: "Heidel",            phone: "+47 99122001",  email: "josefine@heidel.no",                  type: "DANCER" },
  { firstName: "Julie",                  lastName: "Moene",             phone: "+47 93293223",  email: "julie.moene@hotmail.no",              type: "DANCER", notes: "Costume" },
  { firstName: "Julie Rasch",           lastName: "Christensen",                               email: "julie_rc92@hotmail.com",              type: "DANCER" },
  { firstName: "Julie Schartum",        lastName: "Dokken",            phone: "+47 92649164",  email: "juliedokken@hotmail.com",             type: "DANCER" },
  { firstName: "June Elisabeth",        lastName: "Baltzersen",                                email: "junebaltzersen@gmail.com",            type: "DANCER" },
  { firstName: "Kaori",                  lastName: "Solvang",           phone: "+47 95410380",  email: "solvangkaori@gmail.com",              type: "DANCER" },
  { firstName: "Kevin Bårdar",          lastName: "Haugan",            phone: "+47 90610950",  email: "kevin.haugan@baardar.no",             type: "DANCER" },
  { firstName: "Kristian",               lastName: "Vindenes",          phone: "+47 94288254",  email: "kristianvindenes@gmail.com",          type: "DANCER" },
  { firstName: "Lamya",                  lastName: "Taoussi",                                   email: "lamya.taoussi@gmail.com",             type: "DANCER" },
  { firstName: "Lars",                   lastName: "Henriksen",         phone: "+47 41213503",  email: "larshenriksen1@hotmail.no",           type: "DANCER" },
  { firstName: "Laura",                  lastName: "Kolling",           phone: "+47 96233088",  email: "laura.kolling@hotmail.com",           type: "DANCER" },
  { firstName: "Lise",                   lastName: "Nymoen",            phone: "+47 93096455",  email: "lisenymoen@gmail.com",                type: "DANCER" },
  { firstName: "Louise Hellern",        lastName: "Letting",           phone: "+47 93287884",  email: "louise.h.letting@gmail.com",          type: "DANCER" },
  { firstName: "Luis Yasmany Hidalgo",  lastName: "Arzuaga",                                   email: "luisafrosalsa22@gmail.com",           type: "DANCER" },
  { firstName: "Maiken",                 lastName: "Solhaug",           phone: "+47 48999995",  email: "maikensolhaug@outlook.com",           type: "DANCER" },
  { firstName: "Marcus",                 lastName: "Andreassen",        phone: "+47 90720609",  email: "darkmarc1@hotmail.com",               type: "DANCER" },
  { firstName: "Maren",                  lastName: "Hjertø",            phone: "+47 45281927",  email: "maren@showdevida.no",                 type: "DANCER" },
  { firstName: "Maria Elvebakk",        lastName: "Saidi",             phone: "+47 97798660",  email: "mariaelvebakk.saidi@gmail.com",       type: "DANCER" },
  { firstName: "Marie Nilseng",         lastName: "Barben",            phone: "+47 91146456",  email: "marie.nilsengbarben@gmail.com",       type: "DANCER" },
  { firstName: "Martine Elbert",        lastName: "Gudmundsen",        phone: "+47 95334311",  email: "martineelbg@hotmail.com",             type: "DANCER" },
  { firstName: "Max August Key",        lastName: "Graarud",           phone: "+47 47234205",  email: "maxgraarud@icloud.com",               type: "DANCER" },
  { firstName: "Michelle",               lastName: "Purvis",                                    email: "michelle@pitfit.no",                  type: "DANCER" },
  { firstName: "Miguel Carrazana",      lastName: "Barrizonte",        phone: "+47 96699727",  email: "miguelcarrazana@live.no",             type: "DANCER" },
  { firstName: "Nanette",               lastName: "Haugan",            phone: "+47 90528343",  email: "nanette.haugan@baardar.no",           type: "DANCER" },
  { firstName: "Nicole",                 lastName: "Hultvi",            phone: "+46 737367726", email: "nicolehultvi@gmail.com",              type: "DANCER" },
  { firstName: "Nils Johan Oliver",     lastName: "Paulsson",                                  email: "oliverpaulsson1@gmail.com",           type: "DANCER" },
  { firstName: "Omer",                   lastName: "Bhatti",                                    email: "officialobee@gmail.com",              type: "DANCER" },
  { firstName: "Rebekka",               lastName: "Flaarønning",       phone: "+47 95550804",  email: "rebekka.sf@gmail.com",               type: "DANCER" },
  { firstName: "Rebekka Kristoffersen", lastName: "Norvik",            phone: "+47 91777349",  email: "rebekka-n@hotmail.no",               type: "DANCER" },
  { firstName: "Reno",                   lastName: "Andersen",          phone: "+47 45505868",  email: "renothedancer@outlook.com",           type: "DANCER" },
  { firstName: "Richard Raidel Mazorra", lastName: "Mesa",                                     email: "richard.mazorra@gmail.com",           type: "DANCER" },
  { firstName: "Romeo",                  lastName: "Ramos",                                     email: "romeoramos1@gmail.com",               type: "DANCER" },
  { firstName: "Ronald",                 lastName: "Belaza",            phone: "+47 47097485",  email: "ronald_belaza@hotmail.com",           type: "DANCER" },
  { firstName: "Santino",               lastName: "Mirenna",           phone: "+47 90914760",  email: "santinomirenna@gmail.com",            type: "DANCER" },
  { firstName: "Sigurd Aleksander Eriksen", lastName: "Bolstad",       phone: "+47 95805815",  email: "sigurdeb@gmail.com",                  type: "DANCER" },
  { firstName: "Silje",                  lastName: "Vereide",           phone: "+47 41335921",  email: "svereide@hotmail.com",                type: "DANCER" },
  { firstName: "Sofia",                  lastName: "Löfdahl",                                   email: "sofia.lofdahl97@gmail.com",           type: "DANCER" },
  { firstName: "Sophie Louise",         lastName: "Speight",           phone: "+47 46799809",  email: "sophies-lou@hotmail.com",             type: "DANCER" },
  { firstName: "Therese",               lastName: "Thommesen",         phone: "+47 47751448",                                                type: "DANCER", notes: "Inspisient (stage manager)" },
  { firstName: "Vilde",                  lastName: "Frisk",             phone: "+47 45422667",  email: "friskvilde@gmail.com",                type: "DANCER" },
  { firstName: "Vilde",                  lastName: "Opeide",            phone: "+47 95339346",  email: "vildeopeide@gmail.com",               type: "DANCER" },
  { firstName: "Vyara",                  lastName: "Klisurska",         phone: "+47 40106337",  email: "vyara.klisurska@gmail.com",           type: "DANCER" },
  { firstName: "William",               lastName: "Boo",               phone: "+46 707665363", email: "william.boo@live.se",                 type: "DANCER" },
  { firstName: "William",               lastName: "Vikan",             phone: "+47 96010124",  email: "williamvikan@outlook.com",            type: "DANCER" },

  // ──────────────────────────────────────────────────────────────
  // ACROBATS (reclassified from Dancer, plus Christopher/Milena split)
  // ──────────────────────────────────────────────────────────────
  { firstName: "Annie",                  lastName: "Thorkildsen",       phone: "+47 92867109",  email: "annie_th@hotmail.com",                type: "ACROBAT" },
  { firstName: "Beatriz",               lastName: "Lamelas",           phone: "+351 919734660", email: "bea_lamelas@hotmail.com",            type: "ACROBAT", notes: "Circus Artist" },
  { firstName: "Christopher",           lastName: "Hartwig",                                    email: "info@milenaandchristopher.com",        type: "ACROBAT", notes: "Aerial Acrobat — duo with Milena Beneke" },
  { firstName: "Gracie",                 lastName: "Hill",              phone: "+44 7539545433", email: "gracie.tw.hill@gmail.com",           type: "ACROBAT", notes: "Aerial acrobat" },
  { firstName: "Ine",                    lastName: "Austreim",          phone: "+47 45852985",  email: "inewilhelmsen@gmail.com",             type: "ACROBAT", notes: "Luftakrobatikk (aerial)" },
  { firstName: "Jose Fabio Ferreira",   lastName: "Araujo",                                    email: "fabio_bamba@hotmail.com",             type: "ACROBAT" },
  { firstName: "Kami-Lynne",            lastName: "Bruin",             phone: "+31 644738726", email: "kamilynnedebruin@gmail.com",          type: "ACROBAT", notes: "Luftakrobatikk (aerial)" },
  { firstName: "Kleyton Thyrone Alves dos", lastName: "Santos",                                                                               type: "ACROBAT", notes: "Acrobat / Fakir" },
  { firstName: "Mathias",               lastName: "Ramfelt",           phone: "+47 40617886",  email: "mathias@urbancircus.no",              type: "ACROBAT", notes: "Circus artist" },
  { firstName: "Milena",                lastName: "Beneke",                                     email: "info@milenaandchristopher.com",        type: "ACROBAT", notes: "Aerial Acrobat — duo with Christopher Hartwig" },
  { firstName: "Paula",                  lastName: "Alvala",            phone: "+31 0628256430", email: "paula.alvala@icloud.com",            type: "ACROBAT", notes: "Luftakrobatikk (aerial)" },
  { firstName: "Sara Johanne",          lastName: "Rønne",             phone: "+47 97954375",  email: "sarajohanneronne@gmail.com",          type: "ACROBAT", notes: "Aerial acrobat" },
  { firstName: "Simon",                  lastName: "Diamond",           phone: "+47 41270423",  email: "simon@simondiamondphotography.com",   type: "ACROBAT", notes: "Aerial Acrobat" },

  // ──────────────────────────────────────────────────────────────
  // VOCALISTS
  // ──────────────────────────────────────────────────────────────
  { firstName: "Amelie",                 lastName: "Aldner",            phone: "+47 45486031",  email: "aldenheim@yahoo.se",                  type: "VOCALIST" },
  { firstName: "Andrew",                 lastName: "Merry",             phone: "+47 47761488",  email: "andymerrymusic@gmail.com",            type: "VOCALIST" },
  { firstName: "Anna",                   lastName: "Hedblom",           phone: "+47 40491215",  email: "ahedblom@hotmail.com",                type: "VOCALIST" },
  { firstName: "Atle",                   lastName: "Pettersen",                                 email: "pett.atle@gmail.com",                 type: "VOCALIST" },
  { firstName: "Byron",                  lastName: "Williams",          phone: "+47 99599935",  email: "bywill@gmail.com",                    type: "VOCALIST" },
  { firstName: "Charlotte",             lastName: "Brænna",            phone: "+47 99581588",  email: "charlottebranna@hotmail.com",         type: "VOCALIST" },
  { firstName: "Charlotte Sofie",       lastName: "Holtung",           phone: "+47 92461887",  email: "charlotte.seliassen@gmail.com",       type: "VOCALIST" },
  { firstName: "Christiane",            lastName: "Roald",             phone: "+47 98479433",  email: "roaldchristiane@gmail.com",           type: "VOCALIST" },
  { firstName: "Cynthia Amadea",        lastName: "Verazie",           phone: "+47 92523648",  email: "zietara.cynthia@gmail.com",           type: "VOCALIST" },
  { firstName: "Farida Louise Bolseth", lastName: "Benounis",          phone: "+47 95172316",  email: "faridabennis@gmail.com",              type: "VOCALIST" },
  { firstName: "Frode",                  lastName: "Vassel",            phone: "+47 98460999",  email: "kongfrode@gmail.com",                 type: "VOCALIST" },
  { firstName: "Isabelle Eberdean",     lastName: "Bjørneraas",        phone: "+47 90413100",  email: "isabelleberdean@gmail.com",           type: "VOCALIST" },
  { firstName: "Jostein",               lastName: "Fahre",                                      email: "josteinfahre@gmail.com",              type: "VOCALIST", notes: "Operasanger" },
  { firstName: "Kaja Noreen",           lastName: "Rode",              phone: "+47 94197364",  email: "kaja.rode@gmail.com",                 type: "VOCALIST" },
  { firstName: "Katrine Hallenstvedt",  lastName: "Lid",                                        email: "katrinehlid@gmail.com",               type: "VOCALIST" },
  { firstName: "Kim Rune",              lastName: "Hagen",             phone: "+47 47367220",  email: "hagen.kimrune@live.no",              type: "VOCALIST" },
  { firstName: "Lene Kokai",            lastName: "Flage",             phone: "+47 93065737",  email: "lene.kokai.flage@gmail.com",          type: "VOCALIST" },
  { firstName: "Malin",                  lastName: "Joneid",            phone: "+47 99557291",  email: "malin.joneid@gmail.com",              type: "VOCALIST" },
  { firstName: "Marion",                 lastName: "Range",             phone: "+47 93268331",  email: "marion.range@gmail.com",              type: "VOCALIST" },
  { firstName: "Martin Jarl",           lastName: "Velsin",                                     email: "martinjarl@swingitdixieband.com",      type: "VOCALIST", notes: "Singer, Swing it Dixie Band" },
  { firstName: "Nora Foss",             lastName: "Al-Jabri",          phone: "+47 91795819",  email: "norafossa@gmail.com",                 type: "VOCALIST" },
  { firstName: "Oda Kristine",          lastName: "Gondrosen",                                  email: "oda.kristine@hotmail.com",            type: "VOCALIST" },
  { firstName: "Pernille Svensen",      lastName: "Øiestad",                                    email: "pernillesoiestad@gmail.com",          type: "VOCALIST" },
  { firstName: "Richard",               lastName: "Bowers",                                     email: "rickbowers67@yahoo.co.uk",            type: "VOCALIST" },
  { firstName: "Rosie Maribell",        lastName: "Grønvoll",          phone: "+47 97571332",  email: "rosie_gr@hotmail.com",                type: "VOCALIST" },
  { firstName: "Sanna",                  lastName: "Bjerketvedt",       phone: "+47 95443366",  email: "sanna.bjerketvedt3@gmail.com",        type: "VOCALIST" },
  { firstName: "Silje",                  lastName: "Staum",                                      email: "siljestaum@gmail.com",                type: "VOCALIST" },
  { firstName: "Simon",                  lastName: "Thorbjørnsen",      phone: "+47 91681677",  email: "simthorb@gmail.com",                  type: "VOCALIST" }, // moved from DANCER
  { firstName: "Susanne Hvinden",       lastName: "Hals",              phone: "+47 45506256",  email: "susannehvinden@gmail.com",            type: "VOCALIST" },
  { firstName: "Yasmine",               lastName: "Östergren",         phone: "+47 92270176",  email: "yasmine.ostergren@gmail.com",         type: "VOCALIST" },

  // ──────────────────────────────────────────────────────────────
  // MUSICIANS
  // ──────────────────────────────────────────────────────────────
  { firstName: "Alessandro",            lastName: "Russo",             phone: "+47 47652404",  email: "alexax.russo@gmail.com",              type: "MUSICIAN", notes: "Sax" },
  { firstName: "Alex",                   lastName: "Maestro",           phone: "+47 45790895",  email: "maestroalex93@gmail.com",             type: "MUSICIAN", notes: "Trumpet" },
  { firstName: "Andreas",               lastName: "Berg",              phone: "+47 93692719",  email: "andreasbergmusic@gmail.com",          type: "MUSICIAN", notes: "Guitar" },
  { firstName: "Andreas",               lastName: "Fammé",             phone: "+47 41082624",  email: "andreas.famme@gmail.com",             type: "MUSICIAN", notes: "Bass" },
  { firstName: "Arild",                  lastName: "Bakke",             phone: "+47 90873895",  email: "sangmannen@gmail.com",                type: "MUSICIAN", notes: "Piano" },
  { firstName: "Biel",                   lastName: "Santiveri",         phone: "+47 97346931",  email: "bielsantiveri4@gmail.com",            type: "MUSICIAN", notes: "DJ" },
  { firstName: "Carl-Erik",             lastName: "Stray",             phone: "+47 99398850",  email: "stray_@live.no",                      type: "MUSICIAN", notes: "DJ" },
  { firstName: "Carsten",               lastName: "Omholt",            phone: "+47 90640304",  email: "cajo.o@hotmail.com",                  type: "MUSICIAN" },
  { firstName: "David",                  lastName: "Goncalves",         phone: "+47 46944864",  email: "doudouchki@gmail.com",                type: "MUSICIAN", notes: "aka Doudou" },
  { firstName: "Erik",                   lastName: "Aldner",            phone: "+47 95101174",  email: "erik@aldner.no",                      type: "MUSICIAN", notes: "Saxophone" },
  { firstName: "Henrik",                 lastName: "Håland",            phone: "+47 41491252",  email: "henrikhaaland@gmail.com",             type: "MUSICIAN", notes: "Drums" },
  { firstName: "Joachim",               lastName: "Henriksen",         phone: "+47 92893965",  email: "jhenriksenprivat@gmail.com",          type: "MUSICIAN", notes: "Guitar" },
  { firstName: "Jon Are",               lastName: "Kulsveen",          phone: "+47 99381350",  email: "kulsveenproduction@gmail.com",        type: "MUSICIAN", notes: "DJ" },
  { firstName: "Jonas",                  lastName: "Pedersen",          phone: "+47 41599672",  email: "jonas@filakrs.no",                    type: "MUSICIAN", notes: "Drums" },
  { firstName: "Jørn Erik",             lastName: "Gundhus",           phone: "+47 95932499",  email: "jegundhus@gmail.com",                 type: "MUSICIAN", notes: "Piano" },
  { firstName: "Lius",                   lastName: "Baruch",            phone: "+47 45281254",  email: "liusmachado@yahoo.com",               type: "MUSICIAN" },
  { firstName: "Marie",                  lastName: "Klåpbakken",        phone: "+47 95916293",  email: "marieklaapbakken@gmail.com",          type: "MUSICIAN" },
  { firstName: "Marie",                  lastName: "Sahba",             phone: "+47 95134383",  email: "post@mariesahba.com",                 type: "MUSICIAN", notes: "DJ" },
  { firstName: "Marius",                 lastName: "Hjertø",            phone: "+47 97423266",  email: "marius.hjerto@gmail.com",             type: "MUSICIAN", notes: "Guitar" },
  { firstName: "Marius",                 lastName: "Simonsen",          phone: "+47 99109140",  email: "marsimonsen@gmail.com",               type: "MUSICIAN", notes: "Drums" },
  { firstName: "Martin",                 lastName: "Raev",              phone: "+47 47343928",  email: "martin.raev@hotmail.com",             type: "MUSICIAN", notes: "Keys" }, // moved from VOCALIST
  { firstName: "Nick",                   lastName: "Hatch",             phone: "+47 96678274",  email: "nhatchmusic@gmail.com",               type: "MUSICIAN", notes: "Drums" },
  { firstName: "Olve",                   lastName: "Flakne",            phone: "+47 97186736",  email: "olve.flakne@gmail.com",               type: "MUSICIAN", notes: "Guitar" },
  { firstName: "Rogerio",               lastName: "Nunes",             phone: "+47 46929355",  email: "rochnunes@gmail.com",                 type: "MUSICIAN", notes: "Drums" },
  { firstName: "Torbjørn Alsos",        lastName: "Raae",              phone: "+47 47623765",  email: "torbjorn@tretoppstudio.com",          type: "MUSICIAN" },
  { firstName: "Torbjørn",              lastName: "Kvamme",            phone: "+47 90648546",  email: "spillemann@gmail.com",                type: "MUSICIAN", notes: "Piano" },
  { firstName: "Torjus",                lastName: "Eggen",             phone: "+47 91816361",  email: "torjuseggen@gmail.com",               type: "MUSICIAN", notes: "Bass" },
  { firstName: "Vicente Bas",           lastName: "Ibáñez",            phone: "+47 48667829",  email: "vicentbasmusic@gmail.com",            type: "MUSICIAN", notes: "Sax" },
  { firstName: "Yeisy Rojas",           lastName: "Rodriguez",         phone: "+47 48447042",  email: "yeisyrojas90@gmail.com",              type: "MUSICIAN", notes: "Violin" },

  // ──────────────────────────────────────────────────────────────
  // OTHER (support roles kept for the full roster)
  // ──────────────────────────────────────────────────────────────
  { firstName: "Linn Christin",         lastName: "Dale",              phone: "+47 40482129",  email: "linndale94@gmail.com",                type: "OTHER",    notes: "Kostymepakking (costume/warehouse)" },
  { firstName: "Silje Thoresen",        lastName: "Buttingsrud",       phone: "+47 41490194",  email: "silje.thorsen.b@gmail.com",           type: "OTHER",    notes: "SDV Team" },
  { firstName: "Joachim Goa",          lastName: "Steinbru",          phone: "+47 97022570",  email: "joachim@steinbru.com",                type: "OTHER",    notes: "Photographer" },
];

async function main() {
  console.log(`\nImporting ${performers.length} performers…\n`);
  let created = 0;
  let skipped = 0;

  for (const p of performers) {
    try {
      await prisma.$transaction(async (tx) => {
        const contact = await tx.contact.create({
          data: {
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email,
            phone: p.phone,
          },
        });
        await tx.performer.create({
          data: {
            contactId: contact.id,
            type: p.type,
            notes: p.notes,
          },
        });
      });
      console.log(`  ✓  ${p.firstName} ${p.lastName} [${p.type}]`);
      created++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ✗  ${p.firstName} ${p.lastName} — ${msg}`);
      skipped++;
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped.\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
