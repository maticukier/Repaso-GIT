import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Puzzle } from '../lib/generator';
import type { Pos } from '../lib/game';
import { colors } from '../theme';

type Props = {
  puzzle: Puzzle;
  entries: string[][];
  selected: Pos;
  highlighted: Set<string>;
  wrong: Set<string>;
  revealed: Set<string>;
  size: number;
  onPress: (pos: Pos) => void;
};

function Grid({ puzzle, entries, selected, highlighted, wrong, revealed, size, onPress }: Props) {
  const cellSize = Math.floor(size / Math.max(puzzle.rows, puzzle.cols));

  return (
    <View style={[styles.board, { width: cellSize * puzzle.cols + 4 }]}>
      {puzzle.solution.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((letter, c) => {
            if (letter === null) {
              return <View key={c} style={{ width: cellSize, height: cellSize }} />;
            }
            const k = `${r},${c}`;
            const isSelected = selected.row === r && selected.col === c;
            const background = isSelected
              ? colors.cellActive
              : wrong.has(k)
                ? colors.cellWrong
                : highlighted.has(k)
                  ? colors.cellWord
                  : colors.cell;
            const number = puzzle.numbers[r][c];
            return (
              <Pressable
                key={c}
                onPress={() => onPress({ row: r, col: c })}
                accessibilityLabel={`Fila ${r + 1}, columna ${c + 1}`}
                style={[
                  styles.cell,
                  { width: cellSize, height: cellSize, backgroundColor: background },
                ]}
              >
                {number !== null && (
                  <Text style={[styles.number, { fontSize: Math.max(8, cellSize * 0.26) }]}>
                    {number}
                  </Text>
                )}
                <Text
                  style={[
                    styles.letter,
                    { fontSize: cellSize * 0.55 },
                    revealed.has(k) && { color: colors.revealed },
                  ]}
                >
                  {entries[r][c]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default memo(Grid);

const styles = StyleSheet.create({
  board: {
    alignSelf: 'center',
    padding: 2,
    borderRadius: 6,
    backgroundColor: colors.pitchDark,
  },
  row: { flexDirection: 'row' },
  cell: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.pitchDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    position: 'absolute',
    top: 1,
    left: 2,
    color: colors.textMuted,
    fontWeight: '600',
  },
  letter: {
    color: colors.text,
    fontWeight: '700',
  },
});
