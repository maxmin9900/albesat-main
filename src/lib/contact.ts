// Single source of truth for the house's contact details.
//
// These used to be re-typed in each footer, which is how the landing footer
// drifted to an old phone number and an info@ address that nobody reads.
// Every footer, contact card and "email us" link should read from here.

export const CONTACT = {
  phone: "+968 99275151",
  /** same number, digits only — for tel: links */
  phoneHref: "tel:+96899275151",

  email: "Amir@albesat.com",
  emailHref: "mailto:Amir@albesat.com",

  instagram: "albesat.pro",
  instagramHref: "https://www.instagram.com/albesat.pro",

  location: "Muscat, Oman",
  /** long form, for the copyright line and the landing footer */
  locationLong: "Muscat, Sultanate of Oman",
} as const;
