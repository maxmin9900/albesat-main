// ---------------------------------------------------------------------------
// Albesat Carpet — Services page content
// The "answer" blocks are the client-approved Service Details text (condensed
// versions supplied by the client). Labelled lines (Process Summary, Care
// Advice, etc.) render inline with a gold label. Do NOT rewrite the wording.
// ---------------------------------------------------------------------------

/** A paragraph in a service answer — plain text, or a labelled inline note. */
export type Para = string | { label: string; text: string };

export type ServiceItem = {
  slug: string;
  title: string;
  /** short blurb shown on the service card */
  short: string;
  /** full Service-Details answer, revealed by the "+" accordion */
  answer: Para[];
  /**
   * Optional clip shown inside the opened accordion. It only loads once the
   * row is expanded, so a large file costs nothing to visitors who never
   * open it.
   */
  video?: string;
  /**
   * Optional still shown inside the opened accordion, for a service whose
   * work is better read from one photograph than from footage.
   */
  image?: string;
};

export type ServiceCategory = {
  title: string;
  items: ServiceItem[];
};

export const SERVICES_INTRO =
  "At Albesat Carpet, every carpet is carefully inspected before treatment to understand its material, dyes, structure, age, and condition. We provide professional cleaning, restoration, repair, finishing, odor elimination, valuation, and insurance assessment services for handmade, wool, silk, and machine-made carpets.";

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    title: "Cleaning & Care",
    items: [
      {
        slug: "professional-carpet-cleaning",
        title: "Professional Carpet Cleaning",
        short:
          "Careful cleaning for handmade, wool, silk, and fine carpets using suitable methods that protect the texture, colors, and natural character of the carpet.",
        answer: [
          "At Albesat Carpet, every carpet is treated according to its type, material, condition, and weaving structure. Before cleaning begins, each carpet is carefully inspected and categorized based on its origin, construction, yarn material, dye condition, and any existing defects or areas of weakness.",
          "The cleaning process starts while the carpet is still dry. First, the carpet is properly dusted from the back using a professional vibrating device to loosen and release deep dust trapped inside the foundation. This is followed by heavy-duty vacuuming to remove surface and internal dust as much as possible before washing.",
          "After dry dust removal, the carpet is soaked with clean water and vibrated again from both the back and front sides. This helps release remaining dirt and penetrated dust from within the carpet structure.",
          "A safe and suitable detergent is then applied, selected according to the carpet's type, yarn material, dye stability, and overall characteristics. We normally use gentle detergents with an almost neutral pH level, approximately 6 to 6.5, to protect the fibers and colors while achieving an effective clean.",
          "The carpet is then thoroughly rinsed until all excess cleaning substances are removed and clear water is extracted from the carpet. Proper rinsing is an important part of our process, as detergent residue can affect the softness, appearance, and long-term condition of the carpet.",
          "The first stage of drying is carried out using a spin dryer, which removes most of the moisture in a short time. This is followed by controlled sun exposure for a couple of hours, together with air blowers to support even and proper drying.",
          "For machine-made carpets, the carpet then moves to quality control, packing, and dispatch. For hand-knotted carpets, an additional yarn-trimming stage is carried out when required.",
          {
            label: "Free Door-to-Door Pickup & Delivery",
            text: "For customers within Muscat Governorate, we provide free door-to-door pickup and delivery for carpet cleaning services.",
          },
          {
            label: "Process Summary",
            text: "Inspection and categorization, dry dusting from the back side, heavy-duty vacuuming, water soaking and vibration cleaning, safe detergent application, thorough rinsing, spin drying, controlled sunbath and air-blower drying, yarn trimming for hand-knotted carpets when required, final quality control, packing, and free door-to-door pickup and delivery within Muscat Governorate.",
          },
        ],
        video: "/services/professional-carpet-cleaning.mp4",
      },
      {
        slug: "odor-elimination",
        title: "Odor Elimination",
        short:
          "Removal of unpleasant odors caused by moisture, pets, storage, smoke, or other sources, using safe and suitable treatment methods.",
        answer: [
          "Carpets can absorb and hold unpleasant odors from many sources, including moisture, pets, long-term storage, smoke, food spills, water damage, and general environmental exposure. In many cases, odor is not only on the surface but may be trapped deep inside the pile, foundation, or backing of the carpet.",
          "Before treatment begins, the carpet is carefully inspected to identify the possible source of the odor and the condition of the carpet. If the odor is linked to dirt, moisture, stains, pet contamination, or long storage, deep cleaning is usually recommended before odor elimination treatment.",
          "The carpet is then cleaned and rinsed thoroughly to remove the substances that may be causing the smell. After cleaning, suitable deodorizing treatment is applied according to the carpet's material, dye stability, and condition.",
          "When required, we also use HOCL treatment as part of the odor elimination process. HOCL, or hypochlorous acid, is a gentle yet effective solution commonly used for deodorizing and hygiene-related applications.",
          {
            label: "Process Summary",
            text: "Odor source assessment, carpet inspection, deep cleaning when required, thorough rinsing, suitable deodorizing treatment, HOCL treatment when appropriate, proper drying, final odor checking, and quality control before packing and delivery.",
          },
        ],
        image: "/services/odor-elimination.jpg",
      },
    ],
  },
  {
    title: "Restoration & Repair",
    items: [
      {
        slug: "edges-renewal-repair",
        title: "Edges Renewal & Repair",
        short:
          "Repair and reinforcement of damaged carpet edges to prevent further unraveling and restore a clean, finished appearance.",
        answer: [
          "The edges of a carpet play an important role in protecting its structure and preventing the sides from opening, fraying, or unraveling over time.",
          "In handmade carpets, the edges are usually bound by hand using a relatively large stitching needle after the carpet is detached from the loom. These handmade edge bindings normally last for many years, but after around 10 to 15 years, they may become partially loose, worn, or ripped depending on use, age, and storage conditions.",
          "Before repair begins, we carefully inspect the carpet to assess the extent of the damage and the condition of the existing edge binding. If the damage is limited, we carry out partial edge repair while preserving as much of the original finishing as possible. If the edge damage is widespread or the binding has become weak along the full length, we recommend complete edge renewal.",
          {
            label: "Process Summary",
            text: "Inspection of the carpet sides, assessment of damaged or loose areas, partial repair where suitable, complete edge renewal when required, hand-finishing for handmade carpets, machine stitching for machine-made carpets, and final quality control before delivery.",
          },
        ],
        video: "/services/edges-renewal-repair.mp4",
      },
      {
        slug: "fringes-renewal-repair",
        title: "Fringes Renewal & Repair",
        short:
          "Repair, replacement, or renewal of worn, damaged, or missing fringes while respecting the original style, material, and character of the carpet.",
        answer: [
          "In hand-knotted carpets, the fringes are not simply decorative additions. They are the visible extension of the carpet's vertical foundation threads, known as warps. Because fringes remain exposed and loose, their twist can gradually open over time, making them weaker and more vulnerable to wear.",
          "Carpet fringes may be made of cotton, wool, silk, or, in some non-Persian carpets, synthetic materials. Before any repair or renewal begins, we carefully examine the fringes to check their strength, material, condition, and connection to the carpet foundation.",
          "If the fringes break easily with gentle pulling, it usually means they have become too weak and should be renewed. There are different methods for renewing carpet fringes, and the most suitable method is selected according to the carpet's quality, age, material, structure, and sentimental or collector's value.",
          {
            label: "Care Advice",
            text: "When vacuuming, avoid using a brush vacuum directly on the fringes, as this can open the twist of the fringe threads and shorten their lifespan.",
          },
          {
            label: "Process Summary",
            text: "Inspection of fringe strength and material, assessment of partial or full damage, preservation of original fringes where possible, partial renewal when suitable, full fringe renewal when required, protective knotting, advanced museum-level restoration for valuable carpets, ready-fringe attachment for machine-made carpets, and final quality control before delivery.",
          },
        ],
      },
      {
        slug: "moth-damage-repair",
        title: "Moth Damage Repair",
        short:
          "Restoration of areas damaged by moths, including pile repair, foundation checking, careful reweaving, and color and texture matching.",
        answer: [
          "Woollen carpets can be affected by moths when they are stored for a long time, left unmoved, or kept under heavy objects without proper airflow. Moth larvae feed on wool and may gradually eat the pile of the carpet, especially in dark, undisturbed, and low-airflow areas.",
          "Before any repair begins, the carpet is carefully inspected to identify the extent of moth damage. The carpet is then deeply washed to help ensure that no live larvae or eggs remain inside the pile. After cleaning, the actual missing or eaten areas are identified and restored by reweaving the missing knots using wool with physical characteristics as close as possible to the original.",
          {
            label: "Prevention Advice",
            text: "Woollen carpets should be moved, aired, and inspected from time to time, especially when stored or placed under furniture.",
          },
          {
            label: "Termite Damage Note",
            text: "In rare cases, damage to the cotton foundation of a carpet may be caused by termites rather than moths. Termites usually attack cotton warps and wefts, not wool pile.",
          },
          {
            label: "Process Summary",
            text: "Careful inspection, identification of damaged areas, deep washing before repair, reweaving of missing wool knots, matching of wool texture and color, trimming to the correct pile level, foundation checking, termite-related foundation repair when required, and final quality control.",
          },
        ],
        video: "/services/moth-damage-repair.mp4",
      },
      {
        slug: "stain-color-bleeding-removal",
        title: "Stain & Color Bleeding Removal",
        short:
          "Specialized restoration treatment for carpets affected by stains, dye movement, or color bleeding while protecting the original fibers, dyes, and character.",
        answer: [
          "Carpets may become stained by different sources such as coffee, tea, food, greasy substances, wine, soft drinks, and other liquids or materials. In many cases, stains penetrate into the pile and may not be removed by normal surface cleaning.",
          "Before any stain removal treatment begins, the carpet is first deeply cleaned. After cleaning, and upon the customer's approval, the carpet may proceed to a specialized stain removal process. The treatment is selected according to the type of stain, carpet material, dye stability, age, and overall condition of the carpet. Safe and suitable solutions may be used, including lactic acid extracted from Greek yogurt, mild acids, and other carefully selected cleaning or restoration solutions.",
          {
            label: "Color Bleeding",
            text: "Color bleeding happens when unstable dyes move from one area of the carpet into another, often due to moisture, incorrect washing, water damage, or unsuitable cleaning substances.",
          },
          {
            label: "Process Summary",
            text: "Deep cleaning before treatment, inspection of stain type and dye stability, customer approval before specialized treatment, careful application of suitable solutions, delicate stain reduction or removal, color bleeding assessment, protection of surrounding colors, and recommendation of re-dyeing when required.",
          },
        ],
      },
      {
        slug: "water-damage-repair",
        title: "Water Damage Repair",
        short:
          "Assessment, cleaning, drying, and restoration of carpets affected by water damage, including odor, stains, deformation, color bleeding, or weakened areas.",
        answer: [
          "Water damage can affect carpets in different ways depending on the type of carpet, the amount of water, the source of water, and how long the carpet remained wet. Handmade and woollen carpets are especially sensitive to prolonged moisture.",
          "Before any treatment begins, the carpet is carefully inspected to assess the level of damage, the stability of the dyes, the condition of the pile, and whether the foundation has been affected.",
          {
            label: "Important Advice",
            text: "If a carpet becomes wet, it should not be folded, rolled tightly, or left in a closed area while damp. The carpet should be opened, aired, and professionally checked as soon as possible.",
          },
          {
            label: "Process Summary",
            text: "Damage assessment, dye stability checking, deep cleaning when required, thorough rinsing, odor treatment when needed, moisture extraction, controlled drying, inspection for deformation or weakened areas, straightening when required, stain or color bleeding treatment, re-dyeing or reweaving recommendations when necessary, and final quality control.",
          },
        ],
      },
      {
        slug: "carpet-straightening",
        title: "Carpet Straightening",
        short:
          "Correction of carpets that have become wavy, uneven, distorted, or out of shape due to age, humidity, improper storage, washing, or tension imbalance.",
        answer: [
          "Over time, carpets may lose their original shape and become wavy, uneven, crooked, or distorted. This can happen due to humidity, improper washing, poor drying, long-term storage, uneven tension in the foundation, heavy furniture pressure, or natural changes in the carpet's structure over time.",
          {
            label: "Process Summary",
            text: "Inspection of shape distortion, assessment of foundation strength, identification of tension imbalance, careful preparation, controlled moisture and tension treatment, gradual straightening, controlled drying, checking of edges and fringes, and final quality control.",
          },
        ],
      },
      {
        slug: "carpet-color-re-dyeing",
        title: "Carpet Color Re-Dyeing",
        short:
          "Professional re-dyeing and color correction for faded, stained, discolored, or damaged areas, carefully matched to the surrounding tones of the carpet.",
        answer: [
          "Carpet color re-dyeing is a delicate restoration process used to improve areas where the original color has faded, changed, been stained, or lost intensity. This may happen due to sun exposure, chemical contact, stain removal, water damage, wear, or previous unsuitable cleaning.",
          "Because handmade carpets often contain natural color variations, abrash, and aged tones, re-dyeing must be done with care and sensitivity. The goal is to improve the appearance while preserving the carpet's original identity and handmade character.",
          {
            label: "Process Summary",
            text: "Inspection of affected areas, color stability checking, shade matching, selection of suitable dye and technique, careful application, blending with surrounding tones, correction of faded or discolored marks, and final quality control.",
          },
        ],
      },
      {
        slug: "reweaving-damaged-rotten-areas",
        title: "Reweaving Damaged & Rotten Areas",
        short:
          "Careful reweaving of damaged, rotten, torn, or weakened areas in handmade rugs, rebuilding the structure while matching the original materials, texture, colors, and weaving technique.",
        answer: [
          "Handmade carpets may become damaged or weakened due to age, moisture, wear, insects, improper storage, heavy use, or accidental tearing. In some cases, the pile may be missing; in more serious cases, the foundation itself may become rotten, broken, or structurally weak.",
          "This type of restoration requires patience, experience, and detailed knowledge of handmade carpet structure. The aim is to strengthen the carpet, prevent further damage, and restore the visual appearance while preserving its original character and value.",
          {
            label: "Process Summary",
            text: "Inspection of damaged sections, assessment of pile and foundation condition, careful removal of weak or rotten parts, foundation rebuilding when required, re-knotting or reweaving of missing areas, matching of material, color, texture, knot density and pile height, trimming and finishing, and final quality control.",
          },
        ],
      },
    ],
  },
  {
    title: "Finishing & Display",
    items: [
      {
        slug: "installing-leather-trims",
        title: "Installing Leather Trims",
        short:
          "Installation of leather trims on carpet edges to protect them from wear and provide a neat, durable, and elegant finish.",
        answer: [
          "Leather trims can be installed on the edges of carpets to protect them from wear, curling, fraying, or damage caused by regular use. They also provide a neat and elegant finish, especially for carpets placed in areas where the edges are more exposed.",
          {
            label: "Process Summary",
            text: "Inspection of carpet edges, edge repair or reinforcement when required, selection of suitable leather trim, careful attachment, checking of alignment and finish, and final quality control.",
          },
        ],
        video: "/services/installing-leather-trims.mp4",
      },
      {
        slug: "installing-loops-hanging-rugs",
        title: "Installing Loops for Hanging Rugs",
        short:
          "Professional installation of loops or hanging systems for displaying rugs safely on walls without damaging the structure.",
        answer: [
          "Some rugs and carpets are suitable for wall display, either as decorative pieces, collector's items, or valuable handmade works. To hang a rug safely, the support system must be installed carefully so that the weight is distributed properly and the structure of the rug is not damaged.",
          "This service is useful for customers who wish to display carpets at home, in offices, galleries, museums, majlis rooms, or other interior spaces.",
          {
            label: "Process Summary",
            text: "Inspection of rug size, weight, and foundation strength, selection of suitable loop type and spacing, careful installation on the back side, reinforcement when required, checking of hanging balance, and final quality control.",
          },
        ],
      },
    ],
  },
  {
    title: "Valuation & Reports",
    items: [
      {
        slug: "evaluation-insurance-assessments",
        title: "Evaluation Service & Insurance Assessments",
        short:
          "Professional carpet evaluation and condition assessment reports for private owners, institutions, insurance claims, and damage-related cases.",
        answer: [
          "Albesat Carpet provides professional carpet evaluation and assessment services for private owners, institutions, insurance companies, loss adjusters, and damage-related cases. Our evaluations are based on careful visual inspection, carpet knowledge, market experience, and understanding of handmade carpet structure, condition, and value factors.",
          "Each carpet is examined according to its origin, age, material, weaving quality, knot density, design, color condition, size, overall condition, restoration history, and market relevance. Our reports can support insurance claims, damage assessments, restoration decisions, inheritance or private collection records, institutional documentation, and general valuation purposes.",
          {
            label: "Process Summary",
            text: "Carpet inspection, identification of origin and material, review of age and weaving quality, condition assessment, damage documentation when applicable, restoration recommendation, value consideration, insurance claim support when required, and preparation of a professional assessment report.",
          },
        ],
      },
    ],
  },
];
