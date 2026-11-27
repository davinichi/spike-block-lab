// User-provided sample workspaces. Clone before loading or editing.
export const PRIMARY_SCHOOL_WORKSPACES = {
  "Primary_School_01": {
    "blocks": {
      "languageVersion": 0,
      "blocks": [
        {
          "type": "spike_start",
          "id": "B{QEb*}$`O0s+raqj(BG",
          "x": -3201,
          "y": 142,
          "next": {
            "block": {
              "type": "procedures_callnoreturn",
              "id": "C#}0v^%#A(K+X`qMo#)Q",
              "extraState": {
                "name": "0_はじめ"
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "V^`VikfF3|!JqFoqA*Bc",
          "x": 42,
          "y": 168,
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "0_はじめ"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_pair",
                "id": "kd+k;9CsDED~F,Gbo$NA",
                "fields": {
                  "LEFT": "B",
                  "RIGHT": "A"
                },
                "next": {
                  "block": {
                    "type": "lab_geometry",
                    "id": "R[?WE9GcSFy@%;pPJrja",
                    "fields": {
                      "DIAMETER": 56
                    },
                    "next": {
                      "block": {
                        "type": "lab_tread",
                        "id": "0u*yV-bIP57XRzTKPbEd",
                        "fields": {
                          "TREAD": 120
                        },
                        "next": {
                          "block": {
                            "type": "variables_set",
                            "id": "x^oU-X#o$Z5bI~E2Th^u",
                            "fields": {
                              "VAR": {
                                "id": "RB8dNy0|q$r4ZEDi*L0t"
                              }
                            },
                            "inputs": {
                              "VALUE": {
                                "shadow": {
                                  "type": "math_number",
                                  "id": "g_:R5N,1MuJCT:Wu|3-1",
                                  "fields": {
                                    "NUM": 50
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": ";][:iz/-BfX9Nuh(LZ4!",
          "x": 72,
          "y": 1329,
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "9_おわり"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_end",
                "id": "n-4ORk$%1(_A+#0=m^u4"
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "kte9XtZCArfy`WeAt`TB",
          "x": 60,
          "y": 470,
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "1_まえへ1マスすすむ"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_drive_forward",
                "id": "F7e;[V{hwP[n5*|%Xb!/",
                "inputs": {
                  "SPEED": {
                    "shadow": {
                      "type": "math_number",
                      "id": "?{w@Q,$*LRZ_/T^%gS7F",
                      "fields": {
                        "NUM": 20
                      }
                    },
                    "block": {
                      "type": "variables_get",
                      "id": "v~t?cKt)@Yf/LNrAO:bA",
                      "fields": {
                        "VAR": {
                          "id": "RB8dNy0|q$r4ZEDi*L0t"
                        }
                      }
                    }
                  },
                  "CM": {
                    "shadow": {
                      "type": "math_number",
                      "id": "8DA{^odm!nz2NR-EMQUR",
                      "fields": {
                        "NUM": 27.5
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "#!^plg30YRd+t%|=20k.",
          "x": 60,
          "y": 636,
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "2_うしろに１マス下がる"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_drive_backward",
                "id": ":pwHC`7JUIuavR!!s(*`",
                "inputs": {
                  "SPEED": {
                    "shadow": {
                      "type": "math_number",
                      "id": "du1H$paUXw2|=0Fd/l4^",
                      "fields": {
                        "NUM": 20
                      }
                    },
                    "block": {
                      "type": "variables_get",
                      "id": "PLdRfdwi-}wU0~jOI5`!",
                      "fields": {
                        "VAR": {
                          "id": "RB8dNy0|q$r4ZEDi*L0t"
                        }
                      }
                    }
                  },
                  "CM": {
                    "shadow": {
                      "type": "math_number",
                      "id": "RJTtF$_*.5xcCUJ`%Smz",
                      "fields": {
                        "NUM": 27.5
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "qlbh:?Ordr5M:j.~Y~tl",
          "x": 60,
          "y": 802,
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "3_みぎにむく"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_spin_right",
                "id": ".Zk4@b]?eMRUfXQQ^9Oy",
                "inputs": {
                  "SPEED": {
                    "shadow": {
                      "type": "math_number",
                      "id": "3AvXW.7A4s*FFLHC/wi{",
                      "fields": {
                        "NUM": 20
                      }
                    },
                    "block": {
                      "type": "variables_get",
                      "id": "8J`.=,^{=w9s@OkED!}V",
                      "fields": {
                        "VAR": {
                          "id": "RB8dNy0|q$r4ZEDi*L0t"
                        }
                      }
                    }
                  },
                  "ANGLE": {
                    "shadow": {
                      "type": "math_number",
                      "id": "bVM9*.T8I~$)Pts7v]i$",
                      "fields": {
                        "NUM": 90
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "`r$Bn|9f{7WYu:ppFV7M",
          "x": 60,
          "y": 968,
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "4_ひだりにむく"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_spin_left",
                "id": "#fQuv6]KeBXi{]q+Nl%g",
                "inputs": {
                  "SPEED": {
                    "shadow": {
                      "type": "math_number",
                      "id": "._=;PYkN-9VGvOQ.*G)Q",
                      "fields": {
                        "NUM": 20
                      }
                    },
                    "block": {
                      "type": "variables_get",
                      "id": "PchQ1zN~=)Jd{ki-rs;k",
                      "fields": {
                        "VAR": {
                          "id": "RB8dNy0|q$r4ZEDi*L0t"
                        }
                      }
                    }
                  },
                  "ANGLE": {
                    "shadow": {
                      "type": "math_number",
                      "id": "4Th}7UWS8~O[bdA91xKM",
                      "fields": {
                        "NUM": 90
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "}o;RHBKrL{3`y!I_MRpa",
          "x": 60,
          "y": 1134,
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "5_１びょうまつ"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_wait",
                "id": "~|T+L]hSSAvvQop;{82]",
                "inputs": {
                  "SECONDS": {
                    "shadow": {
                      "type": "math_number",
                      "id": "(RPdE!pG:]d6RCCmXg+o",
                      "fields": {
                        "NUM": 1
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_callnoreturn",
          "id": "10},wmSwtl`zlErB4WEe",
          "x": -3196,
          "y": 485,
          "extraState": {
            "name": "9_おわり"
          }
        }
      ]
    },
    "variables": [
      {
        "name": "speed",
        "id": "RB8dNy0|q$r4ZEDi*L0t"
      }
    ]
  },
  "Primary_School_02": {
    "blocks": {
      "languageVersion": 0,
      "blocks": [
        {
          "type": "spike_start",
          "id": "xA$8NcDyTNwDQ?OEvs1K",
          "x": -2653,
          "y": -611,
          "next": {
            "block": {
              "type": "procedures_callnoreturn",
              "id": "MscS#YTKv.9By9Dz%Y=K",
              "extraState": {
                "name": "00_初期設定"
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "3m/8=ve[:P0]oqVl3yo;",
          "x": 578,
          "y": -504,
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "00_初期設定"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_pair",
                "id": "_z6.O:|*%yff{X-t)zbf",
                "fields": {
                  "LEFT": "B",
                  "RIGHT": "A"
                },
                "next": {
                  "block": {
                    "type": "lab_geometry",
                    "id": "Jv^41%EcefZ.b)7Gp8rd",
                    "fields": {
                      "DIAMETER": 56
                    },
                    "next": {
                      "block": {
                        "type": "lab_tread",
                        "id": "R%.}%FRV6S;,Sn$t^yet",
                        "fields": {
                          "TREAD": 123
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "NQMr9XH]!Epf-%/)v}N+",
          "x": 573,
          "y": -177,
          "extraState": {
            "params": [
              {
                "name": "スピード(%)",
                "id": "qG)]aXP|.2-/.0`Ml?t."
              },
              {
                "name": "距離(cm)",
                "id": "F+~)1%TS$1yU5T18YmL+"
              }
            ]
          },
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "01_前進"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_drive_forward",
                "id": "tXE8L5?{Oq14Ev,C/~X1",
                "inputs": {
                  "SPEED": {
                    "shadow": {
                      "type": "math_number",
                      "id": "L;u/W4l?Da0~VFSMJ@55",
                      "fields": {
                        "NUM": 20
                      }
                    },
                    "block": {
                      "type": "lab_argument",
                      "id": "|:iF@|OexWPAI~e{h8L,",
                      "extraState": {
                        "parameterId": "qG)]aXP|.2-/.0`Ml?t.",
                        "name": "スピード(%)"
                      },
                      "fields": {
                        "ARG_NAME": "スピード(%)"
                      }
                    }
                  },
                  "CM": {
                    "shadow": {
                      "type": "math_number",
                      "id": "[du+@q:7/Pa6hR=+IW;;",
                      "fields": {
                        "NUM": 20
                      }
                    },
                    "block": {
                      "type": "lab_argument",
                      "id": "xidYc?6W1$hYbnPwC00u",
                      "extraState": {
                        "parameterId": "F+~)1%TS$1yU5T18YmL+",
                        "name": "距離(cm)"
                      },
                      "fields": {
                        "ARG_NAME": "距離(cm)"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "YXLz!?^]wq;XjcV#8^gD",
          "x": 573,
          "y": 31,
          "extraState": {
            "params": [
              {
                "name": "スピード(%)",
                "id": "qG)]aXP|.2-/.0`Ml?t."
              },
              {
                "name": "角度(  ° )",
                "id": "x3DVjEv(I8;WeEFm)un("
              }
            ]
          },
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "02_右旋回"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_spin_right",
                "id": "!FT4swQ.#Pbao31,elsY",
                "inputs": {
                  "SPEED": {
                    "shadow": {
                      "type": "math_number",
                      "id": "p!nnPN0Nmt@Fo7^5n)h6",
                      "fields": {
                        "NUM": 20
                      }
                    },
                    "block": {
                      "type": "lab_argument",
                      "id": "]ye0Tr/.o|}5d29#Aswy",
                      "extraState": {
                        "parameterId": "qG)]aXP|.2-/.0`Ml?t.",
                        "name": "スピード(%)"
                      },
                      "fields": {
                        "ARG_NAME": "スピード(%)"
                      }
                    }
                  },
                  "ANGLE": {
                    "shadow": {
                      "type": "math_number",
                      "id": "T}~;oaItWpAj!Ywx0|u;",
                      "fields": {
                        "NUM": 90
                      }
                    },
                    "block": {
                      "type": "lab_argument",
                      "id": "`;t4:3+#t!kK6izQ4t$8",
                      "extraState": {
                        "parameterId": "x3DVjEv(I8;WeEFm)un(",
                        "name": "角度(  ° )"
                      },
                      "fields": {
                        "ARG_NAME": "角度(  ° )"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "6m^~b?@[-:S+.e7Z`h2O",
          "x": 571,
          "y": 232,
          "extraState": {
            "params": [
              {
                "name": "スピード(%)",
                "id": "qG)]aXP|.2-/.0`Ml?t."
              },
              {
                "name": "角度(  ° )",
                "id": "x3DVjEv(I8;WeEFm)un("
              }
            ]
          },
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "03_左旋回"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_spin_left",
                "id": "s=_VaGqk?S0^%iIF,TpX",
                "inputs": {
                  "SPEED": {
                    "shadow": {
                      "type": "math_number",
                      "id": "%UM/!l+l#/~-u!g3j)el",
                      "fields": {
                        "NUM": 20
                      }
                    },
                    "block": {
                      "type": "lab_argument",
                      "id": "r#:wQL[SduOk;fk23GgR",
                      "extraState": {
                        "parameterId": "qG)]aXP|.2-/.0`Ml?t.",
                        "name": "スピード(%)"
                      },
                      "fields": {
                        "ARG_NAME": "スピード(%)"
                      }
                    }
                  },
                  "ANGLE": {
                    "shadow": {
                      "type": "math_number",
                      "id": "seS6@}FWdUD2{0j)Zvk=",
                      "fields": {
                        "NUM": 90
                      }
                    },
                    "block": {
                      "type": "lab_argument",
                      "id": "$+-{Mq+l]61t)e*=HeTu",
                      "extraState": {
                        "parameterId": "x3DVjEv(I8;WeEFm)un(",
                        "name": "角度(  ° )"
                      },
                      "fields": {
                        "ARG_NAME": "角度(  ° )"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "sG03Fwsd@aor5M%Qg;m:",
          "x": 592,
          "y": 1158,
          "extraState": {
            "params": [
              {
                "name": "時間(秒)",
                "id": "$ws16Ld1hl:IyDm#X-a*"
              }
            ]
          },
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "08_待機"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_wait",
                "id": "y%-ja9rn:VO#$o*XCvJE",
                "inputs": {
                  "SECONDS": {
                    "shadow": {
                      "type": "math_number",
                      "id": "3Lp)d,3C0r]bj8.}3sGk",
                      "fields": {
                        "NUM": 1
                      }
                    },
                    "block": {
                      "type": "lab_argument",
                      "id": "$-3MA;QClxGygX-E!t2q",
                      "extraState": {
                        "parameterId": "$ws16Ld1hl:IyDm#X-a*",
                        "name": "時間(秒)"
                      },
                      "fields": {
                        "ARG_NAME": "時間(秒)"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "SI!8a;.rbP|=_7Ti@U93",
          "x": 586,
          "y": 796,
          "extraState": {
            "params": [
              {
                "name": "スピード(%)",
                "id": "qG)]aXP|.2-/.0`Ml?t."
              },
              {
                "name": "時間(秒)",
                "id": "$ws16Ld1hl:IyDm#X-a*"
              }
            ]
          },
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "06_アーム(時間)"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_motor_m_single_time",
                "id": "GZEI]!E/bt43V1o=,,:`",
                "fields": {
                  "PORTS": "E"
                },
                "inputs": {
                  "SPEED": {
                    "shadow": {
                      "type": "math_number",
                      "id": "z@$8T$x3aomHeNh%.K[7",
                      "fields": {
                        "NUM": 20
                      }
                    },
                    "block": {
                      "type": "lab_argument",
                      "id": "2?pvspKZ:{8jSUHRRvQo",
                      "extraState": {
                        "parameterId": "qG)]aXP|.2-/.0`Ml?t.",
                        "name": "スピード(%)"
                      },
                      "fields": {
                        "ARG_NAME": "スピード(%)"
                      }
                    }
                  },
                  "SECONDS": {
                    "shadow": {
                      "type": "math_number",
                      "id": "L:5L?_-ahEClT`QtK1p@",
                      "fields": {
                        "NUM": 1
                      }
                    },
                    "block": {
                      "type": "lab_argument",
                      "id": "fZ3RCeM#r6@Egm%fD#[#",
                      "extraState": {
                        "parameterId": "$ws16Ld1hl:IyDm#X-a*",
                        "name": "時間(秒)"
                      },
                      "fields": {
                        "ARG_NAME": "時間(秒)"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "/RjpsUA8U9odz_t,5e1e",
          "x": 582,
          "y": 1694,
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "99_終了"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_end",
                "id": "oEoQo;X,]d*cKR6:PUNL"
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "n/TCkV+QNlq1`[i@VJzV",
          "x": 589,
          "y": 959,
          "extraState": {
            "params": [
              {
                "name": "スピード(%)",
                "id": "qG)]aXP|.2-/.0`Ml?t."
              },
              {
                "name": "角度(  ° )",
                "id": "x3DVjEv(I8;WeEFm)un("
              }
            ]
          },
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "07_アーム(角度)"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_motor_absolute",
                "id": "Tu8[o0)y%1:8WflexA;e",
                "fields": {
                  "PORT": "E",
                  "DIRECTION": "SHORTEST_PATH"
                },
                "inputs": {
                  "SPEED": {
                    "shadow": {
                      "type": "math_number",
                      "id": ";yPTO=lc)@VL8FgTskQ]",
                      "fields": {
                        "NUM": 20
                      }
                    },
                    "block": {
                      "type": "lab_argument",
                      "id": "Wa=[j~KdYI?@XfhDFx%X",
                      "extraState": {
                        "parameterId": "qG)]aXP|.2-/.0`Ml?t.",
                        "name": "スピード(%)"
                      },
                      "fields": {
                        "ARG_NAME": "スピード(%)"
                      }
                    }
                  },
                  "POSITION": {
                    "shadow": {
                      "type": "math_number",
                      "id": "aKSYfN.D)Tz@kxBjTFWN",
                      "fields": {
                        "NUM": 270
                      }
                    },
                    "block": {
                      "type": "lab_op_sub",
                      "id": "P6`W?T|3z3hNk_70?l/]",
                      "inputs": {
                        "A": {
                          "shadow": {
                            "type": "math_number",
                            "id": "$(Z~y0Q)[B)!CA:3vnnZ",
                            "fields": {
                              "NUM": 360
                            }
                          }
                        },
                        "B": {
                          "shadow": {
                            "type": "math_number",
                            "id": "s$V!Tz5(kS]4E8?v{H4;",
                            "fields": {
                              "NUM": 1
                            }
                          },
                          "block": {
                            "type": "lab_argument",
                            "id": "+G4*eG[v~sO+R3oUqe!$",
                            "extraState": {
                              "parameterId": "x3DVjEv(I8;WeEFm)un(",
                              "name": "角度(  ° )"
                            },
                            "fields": {
                              "ARG_NAME": "角度(  ° )"
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "Qe@p}nurFz^]$V`|M~@S",
          "x": 566,
          "y": 416,
          "extraState": {
            "params": [
              {
                "name": "スピード(%)",
                "id": "qG)]aXP|.2-/.0`Ml?t."
              },
              {
                "name": "角度(  ° )",
                "id": "x3DVjEv(I8;WeEFm)un("
              }
            ]
          },
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "04_右P旋回"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_pivot_right",
                "id": "}OZI3j]Gww-s04r%niWj",
                "inputs": {
                  "SPEED": {
                    "shadow": {
                      "type": "math_number",
                      "id": ".Si,jV+*5Ss_=%srlqCE",
                      "fields": {
                        "NUM": 20
                      }
                    },
                    "block": {
                      "type": "lab_argument",
                      "id": "kV95uls:BE9d?kHUE!dU",
                      "extraState": {
                        "parameterId": "qG)]aXP|.2-/.0`Ml?t.",
                        "name": "スピード(%)"
                      },
                      "fields": {
                        "ARG_NAME": "スピード(%)"
                      }
                    }
                  },
                  "ANGLE": {
                    "shadow": {
                      "type": "math_number",
                      "id": "FM#y_yKrUto*Sfan9ZwR",
                      "fields": {
                        "NUM": 90
                      }
                    },
                    "block": {
                      "type": "lab_argument",
                      "id": "yB/Z?9tO^8*^/mv;K!+_",
                      "extraState": {
                        "parameterId": "x3DVjEv(I8;WeEFm)un(",
                        "name": "角度(  ° )"
                      },
                      "fields": {
                        "ARG_NAME": "角度(  ° )"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "~0g|u8Qd|Q;PBNe7{NP,",
          "x": 569,
          "y": 590,
          "extraState": {
            "params": [
              {
                "name": "スピード(%)",
                "id": "qG)]aXP|.2-/.0`Ml?t."
              },
              {
                "name": "角度(  ° )",
                "id": "x3DVjEv(I8;WeEFm)un("
              }
            ]
          },
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "05_左P旋回"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "lab_pivot_left",
                "id": "ge:`reDbYf)s?X=Uccgn",
                "inputs": {
                  "SPEED": {
                    "shadow": {
                      "type": "math_number",
                      "id": "*m;hsGwasXM7JwH9S4c.",
                      "fields": {
                        "NUM": 20
                      }
                    },
                    "block": {
                      "type": "lab_argument",
                      "id": "j@Jnpk,lNQoXZ0lC$Af5",
                      "extraState": {
                        "parameterId": "qG)]aXP|.2-/.0`Ml?t.",
                        "name": "スピード(%)"
                      },
                      "fields": {
                        "ARG_NAME": "スピード(%)"
                      }
                    }
                  },
                  "ANGLE": {
                    "shadow": {
                      "type": "math_number",
                      "id": "g@.0?,*}}vf:+oey.T8h",
                      "fields": {
                        "NUM": 90
                      }
                    },
                    "block": {
                      "type": "lab_argument",
                      "id": "mQP0ERwj9WL?Jjn^VQ|1",
                      "extraState": {
                        "parameterId": "x3DVjEv(I8;WeEFm)un(",
                        "name": "角度(  ° )"
                      },
                      "fields": {
                        "ARG_NAME": "角度(  ° )"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_defnoreturn",
          "id": "4sOwX79O~2DX~.|m)/yh",
          "x": 591,
          "y": 1383,
          "extraState": {
            "params": [
              {
                "name": "スピード(%)",
                "id": "qG)]aXP|.2-/.0`Ml?t."
              },
              {
                "name": "距離(cm)",
                "id": "F+~)1%TS$1yU5T18YmL+"
              }
            ]
          },
          "icons": {
            "comment": {
              "text": "この関数の説明…",
              "pinned": false,
              "height": 80,
              "width": 160
            }
          },
          "fields": {
            "NAME": "09_距離センサ"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "controls_whileUntil",
                "id": "UGcE$!Y,@d0v1!/m3RJO",
                "fields": {
                  "MODE": "WHILE"
                },
                "inputs": {
                  "BOOL": {
                    "block": {
                      "type": "lab_distance_compare",
                      "id": "V)O(M)20VKnT~TrnK.j,",
                      "fields": {
                        "PORT": "C",
                        "OP": "GT"
                      },
                      "inputs": {
                        "VALUE": {
                          "shadow": {
                            "type": "math_number",
                            "id": "XS!FAS=ei7jhl|n)$B66",
                            "fields": {
                              "NUM": 15
                            }
                          },
                          "block": {
                            "type": "lab_argument",
                            "id": "zC*eID+D]iRGgo~k?)mG",
                            "extraState": {
                              "parameterId": "F+~)1%TS$1yU5T18YmL+",
                              "name": "距離(cm)"
                            },
                            "fields": {
                              "ARG_NAME": "距離(cm)"
                            }
                          }
                        }
                      }
                    }
                  },
                  "DO": {
                    "block": {
                      "type": "lab_steering_run",
                      "id": "NfXCkJuK7}_ybwulP{Ap",
                      "inputs": {
                        "TURN": {
                          "shadow": {
                            "type": "math_number",
                            "id": ")FU.8E0-op4BX%%i|4Xf",
                            "fields": {
                              "NUM": 0
                            }
                          }
                        },
                        "SPEED": {
                          "shadow": {
                            "type": "math_number",
                            "id": "YPStNA(4R7$Jcg6]GkZf",
                            "fields": {
                              "NUM": 20
                            }
                          },
                          "block": {
                            "type": "lab_argument",
                            "id": "oo,U|R!W((?J)4QXioZE",
                            "extraState": {
                              "parameterId": "qG)]aXP|.2-/.0`Ml?t.",
                              "name": "スピード(%)"
                            },
                            "fields": {
                              "ARG_NAME": "スピード(%)"
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "procedures_callnoreturn",
          "id": "LTW%j,qf/v6W{7?-}}?/",
          "x": -2629,
          "y": -269,
          "extraState": {
            "name": "99_終了"
          }
        }
      ]
    },
    "variables": [
      {
        "name": "スピード(%)",
        "id": "qG)]aXP|.2-/.0`Ml?t."
      },
      {
        "name": "距離(cm)",
        "id": "F+~)1%TS$1yU5T18YmL+"
      },
      {
        "name": "時間(秒)",
        "id": "$ws16Ld1hl:IyDm#X-a*"
      },
      {
        "name": "角度(  ° )",
        "id": "x3DVjEv(I8;WeEFm)un("
      }
    ]
  }
};
