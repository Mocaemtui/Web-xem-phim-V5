const fs = require('fs');
let content = fs.readFileSync('components/MovieDetail.tsx', 'utf8');

const gridStart = content.indexOf('{/* Main Info Grid */}');
const reviewsStart = content.indexOf('{/* TMDB Reviews */}');

if (gridStart === -1 || reviewsStart === -1) {
  console.log('Could not find markers');
  process.exit(1);
}

const beforeGrid = content.slice(0, gridStart);
const afterGrid = content.slice(reviewsStart);
const gridSection = content.slice(gridStart, reviewsStart);

const extractBlock = (str, startMarker, nextMarker) => {
  const start = str.indexOf(startMarker);
  if (start === -1) return '';
  const end = nextMarker ? str.indexOf(nextMarker, start) : str.length;
  return str.slice(start, end).trim();
};

const posterContent = extractBlock(gridSection, '<div className="col-span-1', '</div>\n\n          {/* Title');
const innerPoster = posterContent.replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '').trim();

const titleContent = extractBlock(gridSection, '<h1', '{/* Ratings */}');
const ratingsContent = extractBlock(gridSection, '{/* Ratings */}', '{/* Info Container');
const metaInfo = extractBlock(gridSection, '{/* Meta Info */}', '{/* Categories */}');
const categories = extractBlock(gridSection, '{/* Categories */}', '{/* Countries */}');
const countries = extractBlock(gridSection, '{/* Countries */}', '{/* Mobile Action Buttons */}');
const mobileActions = extractBlock(gridSection, '{/* Mobile Action Buttons */}', '{/* Desktop Action Buttons */}');
const desktopActions = extractBlock(gridSection, '{/* Desktop Action Buttons */}', '{/* Description */}');
const description = extractBlock(gridSection, '{/* Description */}', '{/* Cast & Crew */}');
const castAndCrew = extractBlock(gridSection, '{/* Cast & Crew */}', '{/* Episode Selector');
const episodeSelector = extractBlock(gridSection, '{/* Episode Selector', '</div>\n        </div>\n\n');

const newLayout = `
        {/* Main Layout using Float for Text Wrapping */}
        <div className="relative w-full overflow-hidden">
          
          {/* Desktop Floated Poster */}
          <div className="hidden md:block float-left w-[300px] lg:w-[400px] mr-8 mb-6 relative z-20">
            ${innerPoster}
          </div>

          {/* Mobile Grid Header (Poster + Title + Ratings) */}
          <div className="md:hidden flex gap-4 mb-4 relative z-20">
            <div className="w-[120px] flex-shrink-0">
              ${innerPoster}
            </div>
            <div className="flex flex-col justify-start min-w-0">
              ${titleContent}
              <div className="mt-2">
                ${ratingsContent}
              </div>
            </div>
          </div>

          {/* Content Wrapper that flows around the floated poster */}
          <div className="flex flex-col gap-4 md:gap-6 relative z-10">
            {/* Desktop Title & Ratings */}
            <div className="hidden md:flex flex-col justify-start min-w-0">
              ${titleContent}
              ${ratingsContent}
            </div>

            ${metaInfo}
            ${categories}
            ${countries}
            ${mobileActions}
            ${desktopActions}
            ${description}
            ${castAndCrew}
          </div>

          {/* Clear the float so episodes start below everything */}
          <div className="clear-both"></div>
          
          <div className="w-full">
            ${episodeSelector}
          </div>
        </div>

        `;

fs.writeFileSync('components/MovieDetail.tsx', beforeGrid + newLayout + afterGrid);
console.log('Successfully refactored layout!');
