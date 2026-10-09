const fs = require('fs');
let lines = fs.readFileSync('components/WatchPageClient.tsx', 'utf8').split('\n');
const targetIndex = lines.findIndex(l => l.includes('const [isRestored, setIsRestored] = useState(false);'));
if (targetIndex !== -1) {
    lines.splice(targetIndex + 1, 0, 
      '  const [playerMode, setPlayerMode] = useState<"iframe" | "hls">("iframe");',
      '  const [subtitlesData, setSubtitlesData] = useState<any[]>([]);',
      '  const [fetchingSubtitles, setFetchingSubtitles] = useState(false);'
    );
    fs.writeFileSync('components/WatchPageClient.tsx', lines.join('\n'));
    console.log("Injected successfully at line " + targetIndex);
} else {
    console.log("Could not find isRestored state");
}
