export type CardinalStakePool = {
  version: "2.2.1";
  name: "cardinal_stake_pool";
  instructions: [
    {
      name: "initIdentifier";
      accounts: [
        {
          name: "identifier";
          isMut: true;
          isSigner: false;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "initPool";
      accounts: [
        {
          name: "stakePool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "identifier";
          isMut: true;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: false;
          isSigner: true;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "ix";
          type: {
            defined: "InitPoolIx";
          };
        }
      ];
    },
    {
      name: "stakeProgrammable";
      accounts: [
        {
          name: "stakeEntry";
          isMut: true;
          isSigner: false;
        },
        {
          name: "rewardEntry";
          isMut: true;
          isSigner: false;
        },
        {
          name: "rewardDistributor";
          isMut: true;
          isSigner: false;
        },
        {
          name: "stakePool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "originalMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "user";
          isMut: true;
          isSigner: true;
        },
        {
          name: "userOriginalMintTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "userOriginalMintTokenRecord";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mintMetadata";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mintEdition";
          isMut: false;
          isSigner: false;
        },
        {
          name: "authorizationRules";
          isMut: false;
          isSigner: false;
        },
        {
          name: "sysvarInstructions";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMetadataProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "authorizationRulesProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rewardDistributorProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        }
      ];
    },
    {
      name: "unstakeProgrammable";
      accounts: [
        {
          name: "stakeEntry";
          isMut: true;
          isSigner: false;
        },
        {
          name: "stakePool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "originalMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "user";
          isMut: true;
          isSigner: true;
        },
        {
          name: "userOriginalMintTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "userOriginalMintTokenRecord";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mintMetadata";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mintEdition";
          isMut: false;
          isSigner: false;
        },
        {
          name: "authorizationRules";
          isMut: false;
          isSigner: false;
        },
        {
          name: "sysvarInstructions";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMetadataProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "authorizationRulesProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "updateTotalStakeSeconds";
      accounts: [
        {
          name: "stakeEntry";
          isMut: true;
          isSigner: false;
        },
        {
          name: "lastStaker";
          isMut: true;
          isSigner: true;
        }
      ];
      args: [];
    }
  ];
  accounts: [
    {
      name: "groupStakeEntry";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "groupId";
            type: "publicKey";
          },
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "stakeEntries";
            type: {
              vec: "publicKey";
            };
          },
          {
            name: "changedAt";
            type: "i64";
          },
          {
            name: "groupCooldownSeconds";
            type: "u32";
          },
          {
            name: "groupStakeSeconds";
            type: "u32";
          },
          {
            name: "groupCooldownStartSeconds";
            type: {
              option: "i64";
            };
          }
        ];
      };
    },
    {
      name: "stakeEntry";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "pool";
            type: "publicKey";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "originalMint";
            type: "publicKey";
          },
          {
            name: "originalMintClaimed";
            type: "bool";
          },
          {
            name: "lastStaker";
            type: "publicKey";
          },
          {
            name: "lastStakedAt";
            type: "i64";
          },
          {
            name: "totalStakeSeconds";
            type: "u128";
          },
          {
            name: "stakeMintClaimed";
            type: "bool";
          },
          {
            name: "kind";
            type: "u8";
          },
          {
            name: "stakeMint";
            type: {
              option: "publicKey";
            };
          },
          {
            name: "cooldownStartSeconds";
            type: {
              option: "i64";
            };
          },
          {
            name: "lastUpdatedAt";
            type: {
              option: "i64";
            };
          },
          {
            name: "grouped";
            type: {
              option: "bool";
            };
          }
        ];
      };
    },
    {
      name: "stakePool";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "identifier";
            type: "u64";
          },
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "requiresCreators";
            type: {
              vec: "publicKey";
            };
          },
          {
            name: "requiresCollections";
            type: {
              vec: "publicKey";
            };
          },
          {
            name: "requiresAuthorization";
            type: "bool";
          },
          {
            name: "overlayText";
            type: "string";
          },
          {
            name: "imageUri";
            type: "string";
          },
          {
            name: "resetOnStake";
            type: "bool";
          },
          {
            name: "totalStaked";
            type: "u32";
          },
          {
            name: "cooldownSeconds";
            type: {
              option: "u32";
            };
          },
          {
            name: "minStakeSeconds";
            type: {
              option: "u32";
            };
          },
          {
            name: "endDate";
            type: {
              option: "i64";
            };
          },
          {
            name: "doubleOrResetEnabled";
            type: {
              option: "bool";
            };
          }
        ];
      };
    },
    {
      name: "stakeBooster";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "stakePool";
            type: "publicKey";
          },
          {
            name: "identifier";
            type: "u64";
          },
          {
            name: "paymentAmount";
            type: "u64";
          },
          {
            name: "paymentMint";
            type: "publicKey";
          },
          {
            name: "paymentManager";
            type: "publicKey";
          },
          {
            name: "paymentRecipient";
            type: "publicKey";
          },
          {
            name: "boostSeconds";
            type: "u128";
          },
          {
            name: "startTimeSeconds";
            type: "i64";
          }
        ];
      };
    },
    {
      name: "stakeAuthorizationRecord";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "pool";
            type: "publicKey";
          },
          {
            name: "mint";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "identifier";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "count";
            type: "u64";
          }
        ];
      };
    }
  ];
  types: [
    {
      name: "InitGroupEntryIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "groupId";
            type: "publicKey";
          },
          {
            name: "groupCooldownSeconds";
            type: {
              option: "u32";
            };
          },
          {
            name: "groupStakeSeconds";
            type: {
              option: "u32";
            };
          }
        ];
      };
    },
    {
      name: "InitPoolIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "overlayText";
            type: "string";
          },
          {
            name: "imageUri";
            type: "string";
          },
          {
            name: "requiresCollections";
            type: {
              vec: "publicKey";
            };
          },
          {
            name: "requiresCreators";
            type: {
              vec: "publicKey";
            };
          },
          {
            name: "requiresAuthorization";
            type: "bool";
          },
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "resetOnStake";
            type: "bool";
          },
          {
            name: "cooldownSeconds";
            type: {
              option: "u32";
            };
          },
          {
            name: "minStakeSeconds";
            type: {
              option: "u32";
            };
          },
          {
            name: "endDate";
            type: {
              option: "i64";
            };
          },
          {
            name: "doubleOrResetEnabled";
            type: {
              option: "bool";
            };
          }
        ];
      };
    },
    {
      name: "InitStakeMintIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "name";
            type: "string";
          },
          {
            name: "symbol";
            type: "string";
          }
        ];
      };
    },
    {
      name: "ReassignStakeEntryIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "target";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "BoostStakeEntryIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "secondsToBoost";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "InitStakeBoosterIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "stakePool";
            type: "publicKey";
          },
          {
            name: "identifier";
            type: "u64";
          },
          {
            name: "paymentAmount";
            type: "u64";
          },
          {
            name: "paymentMint";
            type: "publicKey";
          },
          {
            name: "paymentManager";
            type: "publicKey";
          },
          {
            name: "boostSeconds";
            type: "u128";
          },
          {
            name: "startTimeSeconds";
            type: "i64";
          }
        ];
      };
    },
    {
      name: "UpdateStakeBoosterIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "paymentAmount";
            type: "u64";
          },
          {
            name: "paymentMint";
            type: "publicKey";
          },
          {
            name: "paymentManager";
            type: "publicKey";
          },
          {
            name: "boostSeconds";
            type: "u128";
          },
          {
            name: "startTimeSeconds";
            type: "i64";
          }
        ];
      };
    },
    {
      name: "UpdatePoolIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "imageUri";
            type: {
              option: "string";
            };
          },
          {
            name: "overlayText";
            type: "string";
          },
          {
            name: "requiresCollections";
            type: {
              vec: "publicKey";
            };
          },
          {
            name: "requiresCreators";
            type: {
              vec: "publicKey";
            };
          },
          {
            name: "requiresAuthorization";
            type: "bool";
          },
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "resetOnStake";
            type: "bool";
          },
          {
            name: "cooldownSeconds";
            type: {
              option: "u32";
            };
          },
          {
            name: "minStakeSeconds";
            type: {
              option: "u32";
            };
          },
          {
            name: "endDate";
            type: {
              option: "i64";
            };
          },
          {
            name: "doubleOrResetEnabled";
            type: {
              option: "bool";
            };
          }
        ];
      };
    },
    {
      name: "StakeEntryKind";
      type: {
        kind: "enum";
        variants: [
          {
            name: "Permissionless";
          },
          {
            name: "Permissioned";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 6000;
      name: "InvalidOriginalMint";
      msg: "Original mint is invalid";
    },
    {
      code: 6001;
      name: "InvalidTokenManagerMint";
      msg: "Token Manager mint is invalid";
    },
    {
      code: 6002;
      name: "InvalidUserOriginalMintTokenAccount";
      msg: "Invalid user original mint token account";
    },
    {
      code: 6003;
      name: "InvalidUserMintTokenAccount";
      msg: "Invalid user token manager mint account";
    },
    {
      code: 6004;
      name: "InvalidStakeEntryOriginalMintTokenAccount";
      msg: "Invalid stake entry original mint token account";
    },
    {
      code: 6005;
      name: "InvalidStakeEntryMintTokenAccount";
      msg: "Invalid stake entry token manager mint token account";
    },
    {
      code: 6006;
      name: "InvalidUnstakeUser";
      msg: "Invalid unstake user only last staker can unstake";
    },
    {
      code: 6007;
      name: "InvalidStakePool";
      msg: "Invalid stake pool";
    },
    {
      code: 6008;
      name: "NoMintMetadata";
      msg: "No mint metadata";
    },
    {
      code: 6009;
      name: "MintNotAllowedInPool";
      msg: "Mint not allowed in this pool";
    },
    {
      code: 6010;
      name: "InvalidPoolAuthority";
      msg: "Invalid stake pool authority";
    },
    {
      code: 6011;
      name: "InvalidStakeType";
      msg: "Invalid stake type";
    },
    {
      code: 6012;
      name: "InvalidStakeEntryStakeTokenAccount";
      msg: "Invalid stake entry stake token account";
    },
    {
      code: 6013;
      name: "InvalidLastStaker";
      msg: "Invalid last staker";
    },
    {
      code: 6014;
      name: "InvalidTokenManagerProgram";
      msg: "Invalid token manager program";
    },
    {
      code: 6015;
      name: "InvalidReceiptMint";
      msg: "Invalid receipt mint";
    },
    {
      code: 6016;
      name: "StakeEntryAlreadyStaked";
      msg: "Stake entry already has tokens staked";
    },
    {
      code: 6017;
      name: "InvalidAuthority";
      msg: "Invalid authority";
    },
    {
      code: 6018;
      name: "CannotCloseStakedEntry";
      msg: "Cannot close staked entry";
    },
    {
      code: 6019;
      name: "CannotClosePoolWithStakedEntries";
      msg: "Cannot close staked entry";
    },
    {
      code: 6020;
      name: "CooldownSecondRemaining";
      msg: "Token still has some cooldown seconds remaining";
    },
    {
      code: 6021;
      name: "MinStakeSecondsNotSatisfied";
      msg: "Minimum stake seconds not satisfied";
    },
    {
      code: 6022;
      name: "InvalidStakeAuthorizationRecord";
      msg: "Invalid stake authorization provided";
    },
    {
      code: 6023;
      name: "InvalidMintMetadata";
      msg: "Invalid mint metadata";
    },
    {
      code: 6024;
      name: "StakePoolHasEnded";
      msg: "Stake pool has ended";
    },
    {
      code: 6025;
      name: "InvalidMintMetadataOwner";
      msg: "Mint metadata is owned by the incorrect program";
    },
    {
      code: 6026;
      name: "StakeMintAlreadyInitialized";
      msg: "Stake mint already intialized";
    },
    {
      code: 6027;
      name: "InvalidStakeEntry";
      msg: "Invalid stake entry";
    },
    {
      code: 6028;
      name: "CannotUpdateUnstakedEntry";
      msg: "Cannot update unstaked entry";
    },
    {
      code: 6100;
      name: "CannotBoostUnstakedToken";
      msg: "Cannot boost unstaked token";
    },
    {
      code: 6101;
      name: "CannotBoostMoreThanCurrentTime";
      msg: "Cannot boost past current time less than start time";
    },
    {
      code: 6102;
      name: "InvalidBoostPayerTokenAccount";
      msg: "Invalid boost payer token account";
    },
    {
      code: 6103;
      name: "InvalidBoostPaymentRecipientTokenAccount";
      msg: "Invalid boost payment recipient token account";
    },
    {
      code: 6104;
      name: "InvalidPaymentManager";
      msg: "Invalid payment manager";
    },
    {
      code: 6105;
      name: "CannotBoostFungibleToken";
      msg: "Cannot boost a fungible token stake entry";
    },
    {
      code: 6120;
      name: "GroupedStakeEntry";
      msg: "Grouped stake entry";
    },
    {
      code: 6121;
      name: "UngroupedStakeEntry";
      msg: "Ungrouped stake entry";
    },
    {
      code: 6122;
      name: "MinGroupSecondsNotSatisfied";
      msg: "Minimum group seconds not satisfied";
    },
    {
      code: 6123;
      name: "ActiveGroupEntry";
      msg: "Active group entry";
    },
    {
      code: 6124;
      name: "StakeEntryNotFoundInGroup";
      msg: "Stake entry not found in group";
    },
    {
      code: 6130;
      name: "InvalidFundsMint";
      msg: "Invalid funds mint";
    },
    {
      code: 6131;
      name: "InvalidMintForTokenAccount";
      msg: "Invalid mint for token account";
    },
    {
      code: 6132;
      name: "StakeEntryFundsTokenAccountEmpty";
      msg: "Stake entry funds token account is empty";
    }
  ];
};

export const IDL: CardinalStakePool = {
  version: "2.2.1",
  name: "cardinal_stake_pool",
  instructions: [
    {
      name: "initIdentifier",
      accounts: [
        {
          name: "identifier",
          isMut: true,
          isSigner: false,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "initPool",
      accounts: [
        {
          name: "stakePool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "identifier",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "ix",
          type: {
            defined: "InitPoolIx",
          },
        },
      ],
    },
    {
      name: "stakeProgrammable",
      accounts: [
        {
          name: "stakeEntry",
          isMut: true,
          isSigner: false,
        },
        {
          name: "rewardEntry",
          isMut: true,
          isSigner: false,
        },
        {
          name: "rewardDistributor",
          isMut: true,
          isSigner: false,
        },
        {
          name: "stakePool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "originalMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "user",
          isMut: true,
          isSigner: true,
        },
        {
          name: "userOriginalMintTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "userOriginalMintTokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mintMetadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mintEdition",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRules",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarInstructions",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRulesProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rewardDistributorProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "amount",
          type: "u64",
        },
      ],
    },
    {
      name: "unstakeProgrammable",
      accounts: [
        {
          name: "stakeEntry",
          isMut: true,
          isSigner: false,
        },
        {
          name: "stakePool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "originalMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "user",
          isMut: true,
          isSigner: true,
        },
        {
          name: "userOriginalMintTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "userOriginalMintTokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mintMetadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mintEdition",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRules",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarInstructions",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRulesProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "updateTotalStakeSeconds",
      accounts: [
        {
          name: "stakeEntry",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lastStaker",
          isMut: true,
          isSigner: true,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "groupStakeEntry",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "groupId",
            type: "publicKey",
          },
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "stakeEntries",
            type: {
              vec: "publicKey",
            },
          },
          {
            name: "changedAt",
            type: "i64",
          },
          {
            name: "groupCooldownSeconds",
            type: "u32",
          },
          {
            name: "groupStakeSeconds",
            type: "u32",
          },
          {
            name: "groupCooldownStartSeconds",
            type: {
              option: "i64",
            },
          },
        ],
      },
    },
    {
      name: "stakeEntry",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "pool",
            type: "publicKey",
          },
          {
            name: "amount",
            type: "u64",
          },
          {
            name: "originalMint",
            type: "publicKey",
          },
          {
            name: "originalMintClaimed",
            type: "bool",
          },
          {
            name: "lastStaker",
            type: "publicKey",
          },
          {
            name: "lastStakedAt",
            type: "i64",
          },
          {
            name: "totalStakeSeconds",
            type: "u128",
          },
          {
            name: "stakeMintClaimed",
            type: "bool",
          },
          {
            name: "kind",
            type: "u8",
          },
          {
            name: "stakeMint",
            type: {
              option: "publicKey",
            },
          },
          {
            name: "cooldownStartSeconds",
            type: {
              option: "i64",
            },
          },
          {
            name: "lastUpdatedAt",
            type: {
              option: "i64",
            },
          },
          {
            name: "grouped",
            type: {
              option: "bool",
            },
          },
        ],
      },
    },
    {
      name: "stakePool",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "identifier",
            type: "u64",
          },
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "requiresCreators",
            type: {
              vec: "publicKey",
            },
          },
          {
            name: "requiresCollections",
            type: {
              vec: "publicKey",
            },
          },
          {
            name: "requiresAuthorization",
            type: "bool",
          },
          {
            name: "overlayText",
            type: "string",
          },
          {
            name: "imageUri",
            type: "string",
          },
          {
            name: "resetOnStake",
            type: "bool",
          },
          {
            name: "totalStaked",
            type: "u32",
          },
          {
            name: "cooldownSeconds",
            type: {
              option: "u32",
            },
          },
          {
            name: "minStakeSeconds",
            type: {
              option: "u32",
            },
          },
          {
            name: "endDate",
            type: {
              option: "i64",
            },
          },
          {
            name: "doubleOrResetEnabled",
            type: {
              option: "bool",
            },
          },
        ],
      },
    },
    {
      name: "stakeBooster",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "stakePool",
            type: "publicKey",
          },
          {
            name: "identifier",
            type: "u64",
          },
          {
            name: "paymentAmount",
            type: "u64",
          },
          {
            name: "paymentMint",
            type: "publicKey",
          },
          {
            name: "paymentManager",
            type: "publicKey",
          },
          {
            name: "paymentRecipient",
            type: "publicKey",
          },
          {
            name: "boostSeconds",
            type: "u128",
          },
          {
            name: "startTimeSeconds",
            type: "i64",
          },
        ],
      },
    },
    {
      name: "stakeAuthorizationRecord",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "pool",
            type: "publicKey",
          },
          {
            name: "mint",
            type: "publicKey",
          },
        ],
      },
    },
    {
      name: "identifier",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "count",
            type: "u64",
          },
        ],
      },
    },
  ],
  types: [
    {
      name: "InitGroupEntryIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "groupId",
            type: "publicKey",
          },
          {
            name: "groupCooldownSeconds",
            type: {
              option: "u32",
            },
          },
          {
            name: "groupStakeSeconds",
            type: {
              option: "u32",
            },
          },
        ],
      },
    },
    {
      name: "InitPoolIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "overlayText",
            type: "string",
          },
          {
            name: "imageUri",
            type: "string",
          },
          {
            name: "requiresCollections",
            type: {
              vec: "publicKey",
            },
          },
          {
            name: "requiresCreators",
            type: {
              vec: "publicKey",
            },
          },
          {
            name: "requiresAuthorization",
            type: "bool",
          },
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "resetOnStake",
            type: "bool",
          },
          {
            name: "cooldownSeconds",
            type: {
              option: "u32",
            },
          },
          {
            name: "minStakeSeconds",
            type: {
              option: "u32",
            },
          },
          {
            name: "endDate",
            type: {
              option: "i64",
            },
          },
          {
            name: "doubleOrResetEnabled",
            type: {
              option: "bool",
            },
          },
        ],
      },
    },
    {
      name: "InitStakeMintIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "name",
            type: "string",
          },
          {
            name: "symbol",
            type: "string",
          },
        ],
      },
    },
    {
      name: "ReassignStakeEntryIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "target",
            type: "publicKey",
          },
        ],
      },
    },
    {
      name: "BoostStakeEntryIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "secondsToBoost",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "InitStakeBoosterIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "stakePool",
            type: "publicKey",
          },
          {
            name: "identifier",
            type: "u64",
          },
          {
            name: "paymentAmount",
            type: "u64",
          },
          {
            name: "paymentMint",
            type: "publicKey",
          },
          {
            name: "paymentManager",
            type: "publicKey",
          },
          {
            name: "boostSeconds",
            type: "u128",
          },
          {
            name: "startTimeSeconds",
            type: "i64",
          },
        ],
      },
    },
    {
      name: "UpdateStakeBoosterIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "paymentAmount",
            type: "u64",
          },
          {
            name: "paymentMint",
            type: "publicKey",
          },
          {
            name: "paymentManager",
            type: "publicKey",
          },
          {
            name: "boostSeconds",
            type: "u128",
          },
          {
            name: "startTimeSeconds",
            type: "i64",
          },
        ],
      },
    },
    {
      name: "UpdatePoolIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "imageUri",
            type: {
              option: "string",
            },
          },
          {
            name: "overlayText",
            type: "string",
          },
          {
            name: "requiresCollections",
            type: {
              vec: "publicKey",
            },
          },
          {
            name: "requiresCreators",
            type: {
              vec: "publicKey",
            },
          },
          {
            name: "requiresAuthorization",
            type: "bool",
          },
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "resetOnStake",
            type: "bool",
          },
          {
            name: "cooldownSeconds",
            type: {
              option: "u32",
            },
          },
          {
            name: "minStakeSeconds",
            type: {
              option: "u32",
            },
          },
          {
            name: "endDate",
            type: {
              option: "i64",
            },
          },
          {
            name: "doubleOrResetEnabled",
            type: {
              option: "bool",
            },
          },
        ],
      },
    },
    {
      name: "StakeEntryKind",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Permissionless",
          },
          {
            name: "Permissioned",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "InvalidOriginalMint",
      msg: "Original mint is invalid",
    },
    {
      code: 6001,
      name: "InvalidTokenManagerMint",
      msg: "Token Manager mint is invalid",
    },
    {
      code: 6002,
      name: "InvalidUserOriginalMintTokenAccount",
      msg: "Invalid user original mint token account",
    },
    {
      code: 6003,
      name: "InvalidUserMintTokenAccount",
      msg: "Invalid user token manager mint account",
    },
    {
      code: 6004,
      name: "InvalidStakeEntryOriginalMintTokenAccount",
      msg: "Invalid stake entry original mint token account",
    },
    {
      code: 6005,
      name: "InvalidStakeEntryMintTokenAccount",
      msg: "Invalid stake entry token manager mint token account",
    },
    {
      code: 6006,
      name: "InvalidUnstakeUser",
      msg: "Invalid unstake user only last staker can unstake",
    },
    {
      code: 6007,
      name: "InvalidStakePool",
      msg: "Invalid stake pool",
    },
    {
      code: 6008,
      name: "NoMintMetadata",
      msg: "No mint metadata",
    },
    {
      code: 6009,
      name: "MintNotAllowedInPool",
      msg: "Mint not allowed in this pool",
    },
    {
      code: 6010,
      name: "InvalidPoolAuthority",
      msg: "Invalid stake pool authority",
    },
    {
      code: 6011,
      name: "InvalidStakeType",
      msg: "Invalid stake type",
    },
    {
      code: 6012,
      name: "InvalidStakeEntryStakeTokenAccount",
      msg: "Invalid stake entry stake token account",
    },
    {
      code: 6013,
      name: "InvalidLastStaker",
      msg: "Invalid last staker",
    },
    {
      code: 6014,
      name: "InvalidTokenManagerProgram",
      msg: "Invalid token manager program",
    },
    {
      code: 6015,
      name: "InvalidReceiptMint",
      msg: "Invalid receipt mint",
    },
    {
      code: 6016,
      name: "StakeEntryAlreadyStaked",
      msg: "Stake entry already has tokens staked",
    },
    {
      code: 6017,
      name: "InvalidAuthority",
      msg: "Invalid authority",
    },
    {
      code: 6018,
      name: "CannotCloseStakedEntry",
      msg: "Cannot close staked entry",
    },
    {
      code: 6019,
      name: "CannotClosePoolWithStakedEntries",
      msg: "Cannot close staked entry",
    },
    {
      code: 6020,
      name: "CooldownSecondRemaining",
      msg: "Token still has some cooldown seconds remaining",
    },
    {
      code: 6021,
      name: "MinStakeSecondsNotSatisfied",
      msg: "Minimum stake seconds not satisfied",
    },
    {
      code: 6022,
      name: "InvalidStakeAuthorizationRecord",
      msg: "Invalid stake authorization provided",
    },
    {
      code: 6023,
      name: "InvalidMintMetadata",
      msg: "Invalid mint metadata",
    },
    {
      code: 6024,
      name: "StakePoolHasEnded",
      msg: "Stake pool has ended",
    },
    {
      code: 6025,
      name: "InvalidMintMetadataOwner",
      msg: "Mint metadata is owned by the incorrect program",
    },
    {
      code: 6026,
      name: "StakeMintAlreadyInitialized",
      msg: "Stake mint already intialized",
    },
    {
      code: 6027,
      name: "InvalidStakeEntry",
      msg: "Invalid stake entry",
    },
    {
      code: 6028,
      name: "CannotUpdateUnstakedEntry",
      msg: "Cannot update unstaked entry",
    },
    {
      code: 6100,
      name: "CannotBoostUnstakedToken",
      msg: "Cannot boost unstaked token",
    },
    {
      code: 6101,
      name: "CannotBoostMoreThanCurrentTime",
      msg: "Cannot boost past current time less than start time",
    },
    {
      code: 6102,
      name: "InvalidBoostPayerTokenAccount",
      msg: "Invalid boost payer token account",
    },
    {
      code: 6103,
      name: "InvalidBoostPaymentRecipientTokenAccount",
      msg: "Invalid boost payment recipient token account",
    },
    {
      code: 6104,
      name: "InvalidPaymentManager",
      msg: "Invalid payment manager",
    },
    {
      code: 6105,
      name: "CannotBoostFungibleToken",
      msg: "Cannot boost a fungible token stake entry",
    },
    {
      code: 6120,
      name: "GroupedStakeEntry",
      msg: "Grouped stake entry",
    },
    {
      code: 6121,
      name: "UngroupedStakeEntry",
      msg: "Ungrouped stake entry",
    },
    {
      code: 6122,
      name: "MinGroupSecondsNotSatisfied",
      msg: "Minimum group seconds not satisfied",
    },
    {
      code: 6123,
      name: "ActiveGroupEntry",
      msg: "Active group entry",
    },
    {
      code: 6124,
      name: "StakeEntryNotFoundInGroup",
      msg: "Stake entry not found in group",
    },
    {
      code: 6130,
      name: "InvalidFundsMint",
      msg: "Invalid funds mint",
    },
    {
      code: 6131,
      name: "InvalidMintForTokenAccount",
      msg: "Invalid mint for token account",
    },
    {
      code: 6132,
      name: "StakeEntryFundsTokenAccountEmpty",
      msg: "Stake entry funds token account is empty",
    },
  ],
};
