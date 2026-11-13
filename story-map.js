const mapElement = document.querySelector('#client-story-map');

if (mapElement && window.L) {
  const stories = [
    { id: '919-n-76th', address: '919 N 76th Street, Seattle', type: 'Pending · Buyer representation', summary: 'A Green Lake-walkable home with an income-producing unit drew multiple offers. Coordinating the 1031 exchange intermediary made timing especially important.', outcome: 'Pending after four days', photo: 'Zillow Pictures/1.webp', listingUrl: 'https://www.zillow.com/homedetails/919-N-76th-St-Seattle-WA-98103/48893862_zpid/', lat: 47.6838479, lng: -122.3462844 },
    { id: '4117-eastern', address: '4117 Eastern Avenue N, Seattle', type: 'Buyer representation', summary: 'A first-time buyer purchased after the home had been listed for two weeks. The appraisal came in above the agreed purchase price.', outcome: '$30,000 below asking; $1,000 seller-paid warranty', soldPrice: 1265000, photo: 'Zillow Pictures/2.jpeg', listingUrl: 'https://www.zillow.com/homedetails/4117-Eastern-Ave-N-Seattle-WA-98103/49116421_zpid/', lat: 47.6572449, lng: -122.3293213 },
    { id: '3816-e-spring', address: '3816 E Spring St, Seattle', type: 'Buyer representation', summary: 'The buyer needed a workable move-in date without taking on a rent-back. The sellers also gifted furniture that fit the home.', outcome: '$95,000 below asking after six days on market', photo: 'Zillow Pictures/3.webp', lat: 47.6116518, lng: -122.2839578 },
    { id: '3648-36th-ave', address: '3648 36th Ave S, Unit B, Seattle', type: 'Under contract · Seller representation', summary: 'After 180 days on the market, a fresh evaluation and focused recommendations led to a relaunch. A weekend of open houses brought an offer by Sunday.', outcome: 'Under contract at full asking price', photo: 'Zillow Pictures/4.webp', listingUrl: 'https://www.zillow.com/homedetails/3648-36th-Ave-S-B-B-Seattle-WA-98144/2132224189_zpid/', lat: 47.57012, lng: -122.287897 },
    { id: '13014-ne-197th', address: '13014 NE 197th Pl, Woodinville', type: 'Sold · Seller representation', summary: 'A downsizing client trusted a plan focused on light painting and landscaping. The home was carefully maintained and detail-oriented prep kept the work focused.', outcome: 'Sold in less than 30 days', soldPrice: 1250000, photo: 'Zillow Pictures/5.webp', lat: 47.770839, lng: -122.165765 },
    { id: '13015-ne-197th', address: '13015 NE 197th Pl, Woodinville', type: 'Sold · Seller representation', summary: 'A relocating seller received multiple offers and faced challenging negotiations. Quick communication and attention to detail helped keep the process moving.', outcome: 'Sold in three days for $28,000 over asking', soldPrice: 1426000, photo: 'Zillow Pictures/6.webp', listingUrl: 'https://www.zillow.com/homedetails/13015-NE-197th-Pl-Woodinville-WA-98072/49105051_zpid/', lat: 47.7706807, lng: -122.1655823 },
    { id: '222-4th-ave', address: '222 4th Ave, Kirkland', type: 'Buyer representation', summary: 'Empty-nester buyers wanted a city home near their children. They made a strong offer on a property that had been on the market for 24 months.', outcome: 'Purchased for $45,000 under asking', soldPrice: 1250000, photo: 'Zillow Pictures/222-4th-ave.webp', listingUrl: 'https://www.zillow.com/homedetails/222-4th-Ave-Kirkland-WA-98033/460246725_zpid/', lat: 47.6781856, lng: -122.2054644 },
    { id: '12715-palatine', address: '12715 Palatine Ave N, Seattle, WA 98133', type: 'Co-listing · Seller representation', summary: 'Co-listed with Suzanne Fortune of Windermere HLC.', outcome: 'Reported price: $1,698,000', lat: 47.721561112557, lng: -122.356969462963, detailsOnly: true },
    { id: '17001-inglewood', address: '17001 Inglewood Rd NE #M106, Kenmore, WA 98028', type: 'Sold · Seller representation', summary: 'Seller-side representation. Map pin marks the street address, not the individual unit.', outcome: 'Reported sold price', soldPrice: 452000, photo: 'Zillow Pictures/17001-inglewood.webp', listingUrl: 'https://www.zillow.com/homedetails/17001-Inglewood-Rd-NE-M-106-Kenmore-WA-98028/48882684_zpid/', lat: 47.751157918137, lng: -122.254161361503, detailsOnly: true },
    { id: '23230-44th', photo: 'Zillow Pictures/23230-44th.webp', photoType: 'aerial', address: '23230 44th Dr SE, Bothell, WA 98021', type: 'Buyer representation', summary: 'Buyer-side representation.', outcome: 'Reported sold price', soldPrice: 1230000, listingUrl: 'https://www.zillow.com/homedetails/23230-44th-Dr-SE-Bothell-WA-98021/284878620_zpid/', lat: 47.786253876479, lng: -122.173570681443, detailsOnly: true },
    { id: '11901-32nd', address: '11901 32nd Dr SE, Everett, WA 98208', type: 'Buyer representation', summary: 'Buyer-side representation with Suzanne Fortune of Windermere HLC.', outcome: 'Reported sold price', soldPrice: 720000, photo: 'Zillow Pictures/11901-32nd.webp', listingUrl: 'https://www.zillow.com/homedetails/11901-32nd-Dr-SE-Everett-WA-98208/38522013_zpid/', lat: 47.889684668925, lng: -122.188588297075, detailsOnly: true },
    { id: '12863-ne-200th', address: '12863 NE 200th Pl, Woodinville, WA 98072', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet.', outcome: 'Reported sold price', soldPrice: 1383000, listingUrl: 'https://www.zillow.com/homedetails/12863-NE-200th-Pl-Woodinville-WA-98072/80261263_zpid/', lat: 47.772009454819, lng: -122.168239231684, detailsOnly: true },
    { id: '26586-ne-143rd', address: '26586 NE 143rd St NE #3-C, Duvall, WA 98019', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet. Geocoded to the nearby 143rd Pl street range; unit location is approximate.', outcome: 'Reported sold price', soldPrice: 674990, photo: 'Zillow Pictures/26586-ne-143rd.webp', listingUrl: 'https://www.zillow.com/homedetails/26586-NE-143rd-St-NE-3-C-Duvall-WA-98019/459513781_zpid/', lat: 47.729917281134, lng: -121.983801942142, detailsOnly: true },
    { id: '4040-32nd-ave-sw', address: '4040 32nd Ave SW, Seattle, WA 98126', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet.', outcome: 'Reported sold price', soldPrice: 840000, photo: 'Zillow Pictures/4040-32nd-ave-sw.webp', listingUrl: 'https://www.zillow.com/homedetails/4040-32nd-Ave-SW-Seattle-WA-98126/49127167_zpid/', lat: 47.567569699981, lng: -122.37216499076, detailsOnly: true },
    { id: '19264-ne-69th', photo: 'Zillow Pictures/19264-ne-69th.webp', address: '19264 NE 69th Cir #104, Redmond, WA 98052', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet. Pin marks the street address, not the individual unit.', outcome: 'Reported sold price', soldPrice: 939999, listingUrl: 'https://www.zillow.com/homedetails/19264-NE-69th-Cir-UNIT-104-Redmond-WA-98052/458145650_zpid/', lat: 47.6674462844, lng: -122.083143611477, detailsOnly: true },
    { id: '26547-ne-143rd', photo: 'Zillow Pictures/26547-ne-143rd.webp', address: '26547 NE 143rd Cir NE #9-C, Duvall, WA 98019', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet. Pin is an approximate street-address match; unit location is not specified.', outcome: 'Reported sold price', soldPrice: 699000, listingUrl: 'https://www.zillow.com/homedetails/26547-NE-143rd-Cir-NE-9-C-Duvall-WA-98019/456338442_zpid/', lat: 47.730715865144, lng: -121.983600799918, detailsOnly: true },
    { id: '4343-roosevelt', photo: 'Zillow Pictures/4343-roosevelt.webp', address: '4343 Roosevelt Way NE #202, Seattle, WA 98105', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet. Pin marks the street address, not the individual unit.', outcome: 'Reported sold price', soldPrice: 600000, listingUrl: 'https://www.zillow.com/homedetails/4343-Roosevelt-Way-NE-APT-202-Seattle-WA-98105/48906398_zpid/', lat: 47.660157898029, lng: -122.317820001229, detailsOnly: true },
    { id: '1085-103rd-ave', photo: 'Zillow Pictures/1085-103rd-ave.webp', address: '1085 103rd Ave NE #619, Bellevue, WA 98004', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet. Pin marks the street address, not the individual unit.', outcome: 'Reported sold price', soldPrice: 530000, listingUrl: 'https://www.zillow.com/homedetails/1085-103rd-Ave-NE-APT-619-Bellevue-WA-98004/440753420_zpid/', lat: 47.619629311611, lng: -122.203152987927, detailsOnly: true },
    { id: '11155-134th-ct', photo: 'Zillow Pictures/11155-134th-ct.webp', address: '11155 134th Ct NE Homesite 22, Redmond, WA 98052', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet. Pin marks the street address; the homesite location is approximate.', outcome: 'Reported sold price', soldPrice: 1219590, listingUrl: 'https://www.zillow.com/homedetails/11155-134th-Ct-NE-HOMESITE-22-Redmond-WA-98052/2055518807_zpid/', lat: 47.71011471282, lng: -122.161738560333, detailsOnly: true },
    { id: '315-nw-49th', address: '315 NW 49th St, Seattle, WA 98107', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet.', outcome: 'Reported sold price', soldPrice: 1097925, listingUrl: 'https://www.zillow.com/homedetails/315-NW-49th-St-Seattle-WA-98107/48772036_zpid/', lat: 47.664318951002, lng: -122.361026623848, detailsOnly: true },
    { id: '25-quail-trail', address: '25 S Quail Trail Ln, Coupeville, WA 98239', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet.', outcome: 'Reported sold price', soldPrice: 700000, listingUrl: 'https://www.zillow.com/homedetails/25-S-Quail-Trail-Ln-Coupeville-WA-98239/2071120106_zpid/', lat: 48.210348092245, lng: -122.65744481878, detailsOnly: true },
    { id: '4107-sw-othello', photo: 'Zillow Pictures/4107-sw-othello.webp', address: '4107 SW Othello St, Seattle, WA 98136', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet.', outcome: 'Reported sold price', soldPrice: 1056725, listingUrl: 'https://www.zillow.com/homedetails/4107-SW-Othello-St-Seattle-WA-98136/48933920_zpid/', lat: 47.537508426235, lng: -122.38478999357, detailsOnly: true },
    { id: '6226-76th-ave', photo: 'Zillow Pictures/6226-76th-ave.webp', address: '6226 76th Ave NE, Marysville, WA 98270', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet.', outcome: 'Reported sold price', soldPrice: 930000, listingUrl: 'https://www.zillow.com/homedetails/6226-76th-Ave-NE-Marysville-WA-98270/178092081_zpid/', lat: 48.052768391542, lng: -122.128729010944, detailsOnly: true },
    { id: '803-9th-ave-s', photo: 'Zillow Pictures/803-9th-ave-s.webp', address: '803 9th Ave S, Edmonds, WA 98020', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet.', outcome: 'Reported sold price', soldPrice: 1800000, listingUrl: 'https://www.zillow.com/homedetails/803-9th-Ave-S-Edmonds-WA-98020/72069773_zpid/', lat: 47.804976009814, lng: -122.366840429423, detailsOnly: true },
    { id: '3021-20th-ave-s', photo: 'Zillow Pictures/3021-20th-ave-s.webp', address: '3021 20th Ave S, Seattle, WA 98144', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet.', outcome: 'Reported sold price', soldPrice: 745000, listingUrl: 'https://www.zillow.com/homedetails/3021-20th-Ave-S-Seattle-WA-98144/48678687_zpid/', lat: 47.576747914331, lng: -122.306795641661, detailsOnly: true },
    { id: '86-north-camano', photo: 'Zillow Pictures/86-north-camano.webp', address: '86 E North Camano Dr, Camano Island, WA 98282', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet.', outcome: 'Reported sold price', soldPrice: 499000, listingUrl: 'https://www.zillow.com/homedetails/86-E-North-Camano-Dr-Camano-Island-WA-98282/60910496_zpid/', lat: 48.251169319481, lng: -122.47810258953, detailsOnly: true },
    { id: '1611-ne-75th', photo: 'Zillow Pictures/1611-ne-75th.webp', address: '1611 NE 75th St, Seattle, WA 98115', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet.', outcome: 'Reported sold price', soldPrice: 750000, listingUrl: 'https://www.zillow.com/homedetails/1611-NE-75th-St-Seattle-WA-98115/49143449_zpid/', lat: 47.682987703437, lng: -122.310831883783, detailsOnly: true },
    { id: '211a-151st', photo: 'Zillow Pictures/211a-151st.webp', address: '211-A 151st St SW #2A, Lynnwood, WA 98087', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet. Pin marks the street address, not the individual unit.', outcome: 'Reported sold price', soldPrice: 889990, listingUrl: 'https://www.zillow.com/homedetails/211-A-151st-St-SW-2A-Lynnwood-WA-98087/353035470_zpid/', lat: 47.861205752874, lng: -122.23653227195, detailsOnly: true },
    { id: '1001-casino', photo: 'Zillow Pictures/1001-casino.webp', address: '1001 W Casino Rd #B203, Everett, WA 98204', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet. Pin marks the street address, not the individual unit.', outcome: 'Reported sold price', soldPrice: 398000, listingUrl: 'https://www.zillow.com/homedetails/1001-W-Casino-Rd-APT-B203-Everett-WA-98204/38598248_zpid/', lat: 47.921856321941, lng: -122.246984302802, detailsOnly: true },
    { id: '10458-157th', photo: 'Zillow Pictures/10458-157th.webp', address: '10458 157th Pl NE #101, Redmond, WA 98052', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet. Pin marks the street address, not the individual unit.', outcome: 'Reported sold price', soldPrice: 1034000, listingUrl: 'https://www.zillow.com/homedetails/10458-157th-Pl-NE-APT-101-Redmond-WA-98052/129443389_zpid/', lat: 47.693798007602, lng: -122.131392195018, detailsOnly: true },
    { id: '4405-s-myrtle', photo: 'Zillow Pictures/4405-s-myrtle.webp', address: '4405 S Myrtle St, Seattle, WA 98118', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet.', outcome: 'Reported sold price', soldPrice: 610000, listingUrl: 'https://www.zillow.com/homedetails/4405-S-Myrtle-St-Seattle-WA-98118/48699388_zpid/', lat: 47.538834017733, lng: -122.27793041626, detailsOnly: true },
    { id: '14327-cascade', address: '14327 Cascade Dr SE, Snohomish, WA 98296', type: 'Sold · Representation not specified', summary: 'Listing details from the supplied spreadsheet.', outcome: 'Reported sold price', soldPrice: 924000, listingUrl: 'https://www.zillow.com/homedetails/14327-Cascade-Dr-SE-Snohomish-WA-98296/38578215_zpid/', lat: 47.866995276861, lng: -122.143005940222, detailsOnly: true },
    { id: '1833-27th', address: '1833 27th Ave, Seattle, WA 98122', type: 'Sold · Listed In-House | Sold (report)', summary: 'Closed transaction from the supplied agent production report.', outcome: 'Reported sold price', soldPrice: 850000, mls: '2479263', listPrice: 850000, listDate: '02/10/2026', soldDate: '02/10/2026', dom: 0, reportCategory: 'Listed In-House | Sold', lat: 47.618062884848, lng: -122.29735068332, detailsOnly: true },
    { id: '4029-ashworth', address: '4029 Ashworth Ave N, Seattle, WA 98103', type: 'Sold · Co-op Listed (report)', summary: 'Closed transaction from the supplied agent production report.', outcome: 'Reported sold price', soldPrice: 2180000, mls: '2445370', listPrice: 2180000, listDate: '10/17/2025', soldDate: '12/08/2025', dom: 20, reportCategory: 'Co-op Listed | Sold', lat: 47.656030491177, lng: -122.339893995501, detailsOnly: true },
    { id: '4224-144th-lane-se', address: '4224 144th Lane SE, Bellevue, WA 98006', type: 'Sold · CoList | CoSold (report)', summary: 'Closed transaction from the supplied agent production report.', outcome: 'Reported sold price', soldPrice: 975000, mls: '2194484', listPrice: 956000, listDate: '02/15/2024', soldDate: '03/18/2024', dom: 5, reportCategory: 'CoList | CoSold', lat: 47.571189871765, lng: -122.147586083215, detailsOnly: true },
    { id: '8932-lowell-larimer', address: '8932 Lowell Larimer Rd, Everett, WA 98208', type: 'Sold · CoList | CoSold (report)', summary: 'Closed transaction from the supplied agent production report.', outcome: 'Reported sold price', soldPrice: 793550, mls: '2204457', listPrice: 799950, listDate: '02/28/2024', soldDate: '04/18/2024', dom: 19, reportCategory: 'CoList | CoSold', lat: 47.916716096172, lng: -122.17887867449, detailsOnly: true },
    { id: '2822-e-thomas', address: '2822 E Thomas St, Seattle, WA 98112', type: 'Sold · CoList | CoSold (report)', summary: 'Closed transaction from the supplied agent production report.', outcome: 'Reported sold price', soldPrice: 1050000, mls: '2222061', listPrice: 1100000, listDate: '05/09/2024', soldDate: '07/03/2024', dom: 27, reportCategory: 'CoList | CoSold', lat: 47.621397988737, lng: -122.295770772721, detailsOnly: true },
    { id: '601-alder', address: '601 Alder St, Twisp, WA 98856', type: 'Sold · CoList | CoSold (report)', summary: 'Closed transaction from the supplied agent production report.', outcome: 'Reported sold price', soldPrice: 425000, mls: '2235696', listPrice: 480000, listDate: '05/10/2024', soldDate: '06/28/2024', dom: 12, reportCategory: 'CoList | CoSold', lat: 48.360943604306, lng: -120.116927345448, detailsOnly: true },
    { id: '76-donahey', address: '76 Donahey Rd, Coupeville, WA 98239', type: 'Sold · CoList | CoSold (report)', summary: 'Closed transaction from the supplied agent production report.', outcome: 'Reported sold price', soldPrice: 2205000, mls: '2276725', listPrice: 2285000, listDate: '08/15/2024', soldDate: '10/15/2024', dom: 29, reportCategory: 'CoList | CoSold', lat: 48.147321847069, lng: -122.604455716494, detailsOnly: true },
    { id: '11520-56th-dr-se', address: '11520 56th Dr SE, Everett, WA 98208', type: 'Sold · CoList | CoSold (report)', summary: 'Closed transaction from the supplied agent production report.', outcome: 'Reported sold price', soldPrice: 950000, mls: '2309158', listPrice: 918000, listDate: '11/08/2024', soldDate: '12/11/2024', dom: 3, reportCategory: 'CoList | CoSold', lat: 47.892739185082, lng: -122.157899458966, detailsOnly: true },
    { id: '2404-mugho', address: '2404 Mugho St SE, Olympia, WA 98513', type: 'Sold · CoList | CoSold (report)', summary: 'Closed transaction from the supplied agent production report.', outcome: 'Reported sold price', soldPrice: 789000, mls: '2331302', listPrice: 789000, listDate: '02/13/2025', soldDate: '03/31/2025', dom: 20, reportCategory: 'CoList | CoSold', lat: 47.025575620399, lng: -122.757443977043, detailsOnly: true },
    { id: '713-pilchuck', address: '713 Pilchuck Rd, Greenbank, WA 98253', type: 'Sold · CoList | CoSold (report)', summary: 'Closed transaction from the supplied agent production report. The pin is approximate; the geocoder matched 713 Pilchuck Dr.', outcome: 'Reported sold price', soldPrice: 395000, mls: '2339629', listPrice: 395000, listDate: '03/06/2025', soldDate: '04/22/2025', dom: 13, reportCategory: 'CoList | CoSold', lat: 48.059688633336, lng: -122.577155047365, detailsOnly: true },
    { id: '1532-maple', address: '1532 Maple St, Everett, WA 98201', type: 'Sold · CoList | CoSold (report)', summary: 'Closed transaction from the supplied agent production report.', outcome: 'Reported sold price', soldPrice: 650000, mls: '2353564', listPrice: 650000, listDate: '04/03/2025', soldDate: '05/16/2025', dom: 8, reportCategory: 'CoList | CoSold', lat: 47.997070926684, lng: -122.190635862498, detailsOnly: true },
    { id: '13150-ne-203rd', address: '13150 NE 203rd Pl, Woodinville, WA 98072', type: 'Sold · CoList | CoSold (report)', summary: 'Closed transaction from the supplied agent production report.', outcome: 'Reported sold price', soldPrice: 1312500, mls: '2499343', listPrice: 1325000, listDate: '05/28/2026', soldDate: '06/30/2026', dom: 4, reportCategory: 'CoList | CoSold', lat: 47.775279730859, lng: -122.164482400113, detailsOnly: true },
  ];

  const map = L.map(mapElement, { scrollWheelZoom: false, center: [47.67, -122.25], zoom: 10 });
  const mapStatus = document.createElement('p');
  mapStatus.className = 'story-map-status';
  mapStatus.setAttribute('role', 'status');
  mapStatus.hidden = true;
  mapElement.after(mapStatus);
  if (window.maplibregl && L.maplibreGL) {
    try {
      const basemap = L.maplibreGL({
        style: {
          version: 8,
          glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
          sources: {
            geography: {
              type: 'vector',
              url: 'https://tiles.openfreemap.org/planet',
              attribution: '<a href="https://openfreemap.org/">OpenFreeMap</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
          },
          layers: [
            { id: 'land', type: 'background', paint: { 'background-color': '#D6E4D4' } },
            {
              id: 'water',
              type: 'fill',
              source: 'geography',
              'source-layer': 'water',
              paint: { 'fill-color': '#A8CEDF', 'fill-antialias': true },
            },
            {
              id: 'local-roads',
              type: 'line',
              source: 'geography',
              'source-layer': 'transportation',
              minzoom: 11,
              filter: ['match', ['get', 'class'], ['minor', 'service', 'tertiary'], true, false],
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: {
                'line-color': '#EDF3E9',
                'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 16, 3],
              },
            },
            {
              id: 'main-roads',
              type: 'line',
              source: 'geography',
              'source-layer': 'transportation',
              filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary'], true, false],
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: {
                'line-color': '#F5F7EC',
                'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.7, 12, 2, 16, 5],
              },
            },
            {
              id: 'road-names',
              type: 'symbol',
              source: 'geography',
              'source-layer': 'transportation_name',
              minzoom: 11,
              layout: {
                'symbol-placement': 'line',
                'symbol-spacing': 350,
                'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name'], ['get', 'ref']],
                'text-font': ['Noto Sans Regular'],
                'text-size': 11,
              },
              paint: { 'text-color': '#405A46', 'text-halo-color': '#D6E4D4', 'text-halo-width': 1.5 },
            },
            {
              id: 'water-names',
              type: 'symbol',
              source: 'geography',
              'source-layer': 'water_name',
              layout: {
                'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
                'text-font': ['Noto Sans Italic'],
                'text-size': 12,
                'text-max-width': 8,
              },
              paint: { 'text-color': '#34596E', 'text-halo-color': '#A8CEDF', 'text-halo-width': 1.5 },
            },
            {
              id: 'place-names',
              type: 'symbol',
              source: 'geography',
              'source-layer': 'place',
              minzoom: 8,
              filter: ['match', ['get', 'class'], ['city', 'town', 'village', 'suburb', 'neighbourhood', 'quarter'], true, false],
              layout: {
                'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
                'text-font': ['Noto Sans Regular'],
                'text-size': ['match', ['get', 'class'], ['city', 'town'], 16, 12],
                'text-max-width': 9,
                'text-padding': 8,
              },
              paint: { 'text-color': '#304B38', 'text-halo-color': '#D6E4D4', 'text-halo-width': 2 },
            },
          ],
        },
      }).addTo(map);
      const renderer = basemap.getMaplibreMap();
      renderer.on('error', (event) => {
        console.error('Client story basemap failed to load.', event.error);
        mapStatus.textContent = 'The map background could not load. You can still select story pins or read the addresses below.';
        mapStatus.hidden = false;
      });
      renderer.on('idle', () => {
        if (renderer.isSourceLoaded('geography')) mapStatus.hidden = true;
      });
    } catch (error) {
      console.error('Client story basemap could not initialize.', error);
      mapStatus.textContent = 'The map background could not start. Check WebGL support, or select story pins and read the addresses below.';
      mapStatus.hidden = false;
    }
  } else {
    mapStatus.textContent = 'The map background resources could not load. You can still select story pins or read the addresses below.';
    mapStatus.hidden = false;
  }

  const markers = stories.map((story, index) => {
    const markerType = story.type.includes('Buyer representation')
      ? 'buy'
      : story.type.includes('Under contract') ? 'pending'
        : story.type.includes('Sold') ? 'sold' : 'sell';
    const markerLabel = { buy: 'Buy', sold: 'Sold', pending: 'Pending', sell: 'Sell' }[markerType];
    const markerIcon = L.divIcon({
      className: 'story-map-marker-wrap',
      html: `<span class="story-map-marker story-map-marker--${markerType}" aria-hidden="true"><span>${markerLabel}</span><span class="story-map-marker-number">${index + 1}</span></span>`,
      iconSize: [markerType === 'pending' ? 78 : 64, 32],
      iconAnchor: [
        markerType === 'pending' ? 39 : 32,
        story.id === '23230-44th' ? 90 : index === 4 ? 52 : 16,
      ],
    });
    const marker = L.marker([story.lat, story.lng], {
      icon: markerIcon,
      title: `${markerLabel} story ${index + 1}: ${story.address}`,
      alt: `${markerLabel} marker ${index + 1}: ${story.address}`,
    }).addTo(map);
    const popup = document.createElement('div');
    popup.className = 'story-map-popup';
    if (story.photo) {
      const figure = document.createElement('figure');
      figure.className = 'story-map-image';
      const photo = document.createElement('img');
      photo.src = story.photo;
      const isAerial = story.photoType === 'aerial';
      photo.alt = isAerial ? `Aerial view of the surrounding development for ${story.address}` : `Listing photo for ${story.address}`;
      if (isAerial) photo.style.objectFit = 'contain';
      photo.decoding = 'async';
      const caption = document.createElement('figcaption');
      caption.textContent = isAerial ? 'Supplied aerial view of the development; not an exact unit view' : 'Property listing photo';
      figure.append(photo, caption);
      popup.append(figure);
    }
    const address = document.createElement('strong');
    address.textContent = `${index + 1}. ${story.address}`;
    const type = document.createElement('span');
    type.textContent = story.type;
    const summary = document.createElement('p');
    summary.textContent = story.summary;
    let soldPrice;
    if (story.soldPrice) {
      soldPrice = document.createElement('strong');
      soldPrice.className = 'story-map-sold-price';
      soldPrice.textContent = `Reported sold price: $${story.soldPrice.toLocaleString('en-US')}`;
    }
    const link = document.createElement('a');
    link.href = `#${story.id}`;
    link.textContent = story.detailsOnly ? 'View property details' : 'Read this story';
    if (story.detailsOnly) {
      link.addEventListener('click', () => {
        document.querySelector('.additional-map-properties').open = true;
      });
    }
    popup.append(address, type, summary);
    if (soldPrice) popup.append(soldPrice);
    if (story.mls) {
      const reportDetails = document.createElement('span');
      reportDetails.className = 'story-map-report-details';
      reportDetails.textContent = `MLS #${story.mls} · List price $${story.listPrice.toLocaleString('en-US')} · Listed ${story.listDate} · Sold ${story.soldDate} · ${story.dom} days on market · ${story.reportCategory}`;
      popup.append(reportDetails);
    }
    if (story.outcome && !(story.soldPrice && story.outcome === 'Reported sold price')) {
      const outcome = document.createElement('span');
      outcome.textContent = story.outcome;
      popup.append(outcome);
    }
    popup.append(link);
    if (story.listingUrl) {
      const listingLink = document.createElement('a');
      listingLink.href = story.listingUrl;
      listingLink.target = '_blank';
      listingLink.rel = 'noopener noreferrer';
      listingLink.textContent = 'Open listing on Zillow';
      popup.append(listingLink);
    }
    marker.bindPopup(popup, { maxWidth: 300, minWidth: 240, autoPan: false });
    marker.on('popupopen', () => marker.getElement()?.classList.add('is-active'));
    marker.on('popupclose', () => marker.getElement()?.classList.remove('is-active'));
    marker.on('click', () => {
      setTimeout(() => {
        const storyPopup = marker.getPopup();
        if (!storyPopup?.isOpen()) return;
        const popupElement = storyPopup.getElement();
        if (!popupElement) return;
        const horizontalPadding = popupElement.offsetWidth / 2 + 12;
        const verticalPadding = popupElement.offsetHeight + 24;
        map.panInside(marker.getLatLng(), {
          paddingTopLeft: L.point(horizontalPadding, verticalPadding),
          paddingBottomRight: L.point(horizontalPadding, 12),
          animate: false,
        });
      }, 0);
    });
    return marker;
  });

  const storyBounds = L.featureGroup(markers).getBounds().pad(0.1);
  const fitStoryOverview = () => {
    map.fitBounds(storyBounds, { padding: [48, 64], maxZoom: 11, animate: false });
    map.setZoom(map.getZoom() + 1, { animate: false });
  };
  let popupIsOpen = false;
  let recenterTimeout;
  map.on('resize', () => {
    if (!popupIsOpen) fitStoryOverview();
  });
  map.on('popupopen', () => {
    popupIsOpen = true;
    clearTimeout(recenterTimeout);
  });
  map.on('popupclose', () => {
    popupIsOpen = false;
    clearTimeout(recenterTimeout);
    recenterTimeout = setTimeout(() => {
      if (!popupIsOpen) fitStoryOverview();
    }, 0);
  });
  fitStoryOverview();
} else if (mapElement) {
  mapElement.setAttribute('role', 'status');
  mapElement.textContent = 'The interactive map is unavailable. The story addresses are listed below.';
}